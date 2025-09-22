use lz4_flex::{compress_prepend_size, decompress_size_prepended};
use serde_json::Value;
use std::error::Error;
use base64::prelude::*;

const COMPRESSION_THRESHOLD: usize = 32_768; // 32KB

pub fn compress_if_beneficial(data: &Value) -> Result<(Vec<u8>, bool), Box<dyn Error>> {
    let json_string = serde_json::to_string(data)?;
    let json_bytes = json_string.as_bytes();

    if json_bytes.len() > COMPRESSION_THRESHOLD {
        let compressed = compress_prepend_size(json_bytes);

        // Only use compression if it provides significant benefit
        if compressed.len() < (json_bytes.len() * 3 / 4) {
            return Ok((compressed, true));
        }
    }

    // Store as JSONB for smaller uncompressed data
    Ok((json_bytes.to_vec(), false))
}

pub fn decompress_data(data: &[u8], is_compressed: bool) -> Result<Value, Box<dyn Error>> {
    let json_bytes = if is_compressed {
        decompress_size_prepended(data)?
    } else {
        data.to_vec()
    };

    let json_string = String::from_utf8(json_bytes)?;
    Ok(serde_json::from_str(&json_string)?)
}

// Specialized telemetry compression with additional optimizations
pub fn compress_telemetry_data(telemetry: &[Value]) -> Result<Value, Box<dyn Error>> {
    // Pre-process telemetry data for better compression
    let optimized_data: Vec<Value> = telemetry.iter().map(|point| {
        let mut optimized = point.clone();

        // Remove null fields to reduce size
        if let Value::Object(ref mut map) = optimized {
            map.retain(|_, v| !v.is_null());
        }

        optimized
    }).collect();

    let (compressed_data, was_compressed) = compress_if_beneficial(&Value::Array(optimized_data))?;

    // Use proper base64 encoding
    let encoded_data = BASE64_STANDARD.encode(&compressed_data);

    Ok(serde_json::json!({
        "compressed": was_compressed,
        "original_length": telemetry.len(),
        "data": encoded_data
    }))
}

// Decompress telemetry data that was compressed with compress_telemetry_data
pub fn decompress_telemetry_data(compressed_telemetry: &Value) -> Result<Vec<Value>, Box<dyn Error>> {
    // Check if data is in the compressed format
    if let Some(obj) = compressed_telemetry.as_object() {
        // Check if it's compressed telemetry data format
        if let (Some(compressed_flag), Some(data_str)) = (
            obj.get("compressed").and_then(|v| v.as_bool()),
            obj.get("data").and_then(|v| v.as_str())
        ) {
            if compressed_flag {
                // Decode base64 and decompress
                let compressed_bytes = BASE64_STANDARD.decode(data_str)?;
                let decompressed_data = decompress_data(&compressed_bytes, true)?;
                
                // Return as array of telemetry points
                if let Some(array) = decompressed_data.as_array() {
                    return Ok(array.clone());
                } else {
                    return Err("Decompressed data is not an array".into());
                }
            } else {
                // Data was not compressed, decode base64 directly
                let json_bytes = BASE64_STANDARD.decode(data_str)?;
                let json_string = String::from_utf8(json_bytes)?;
                let data: Value = serde_json::from_str(&json_string)?;
                
                if let Some(array) = data.as_array() {
                    return Ok(array.clone());
                } else {
                    return Err("Uncompressed data is not an array".into());
                }
            }
        }
    }
    
    // If it's already in array format (legacy or uncompressed), return as-is
    if let Some(array) = compressed_telemetry.as_array() {
        Ok(array.clone())
    } else {
        Err("Invalid telemetry data format".into())
    }
}

