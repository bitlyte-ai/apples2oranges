// Contains read_core_temperatures function for IOHIDEventSystemClient temperature detection

use std::os::raw::{c_char, c_void};
use std::ffi::CStr;
use std::ptr;
use serde::{Serialize, Deserialize};

// Temperature monitoring structs - Priority 4.2 extraction
#[derive(Debug, Deserialize)]
pub struct TemperatureInfo {
    pub cpu_temp_avg: Option<f64>,
    pub gpu_temp_avg: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CoreTemperatureData {
    pub p_cores: Vec<f64>,      // Temperature sensors near performance core area
    pub e_cores: Vec<f64>,      // Temperature sensors near efficiency core area
    pub cpu_temp_avg: f64,      // Average across all cores
    pub cpu_temp_max: f64,      // Maximum temperature across all cores
    pub cpu_temp_min: f64,      // Minimum temperature across all cores
    pub gpu_temps: Vec<f64>,    // GPU cluster temperatures
    pub gpu_temp_avg: Option<f64>,
    pub gpu_temp_max: Option<f64>,
    pub battery_temp_avg: Option<f64>,  // Battery temperature average
    pub thermal_trend: ThermalTrend,
}

#[derive(Debug, Clone, Serialize)]
pub enum ThermalTrend {
    Cooling,    // Temperature decreasing
    Heating,    // Temperature increasing
    Stable,     // Temperature stable
    Rapid,      // Rapid temperature change
}

// IOHIDEventSystemClient bindings for Apple Silicon temperature sensors
type CFTypeRef = *const c_void;
type CFDictionaryRef = *const c_void;
type CFArrayRef = *const c_void;
type CFStringRef = *const c_void;
type CFNumberRef = *const c_void;
type IOHIDEventSystemClientRef = *const c_void;
type IOHIDServiceClientRef = *const c_void;
type IOHIDEventRef = *const c_void;

const K_HIDPAGE_APPLE_VENDOR: u32 = 0xff00;
const K_HIDUSAGE_APPLE_VENDOR_TEMPERATURE_SENSOR: u32 = 0x0005;
const K_IOHIDEVENT_TYPE_TEMPERATURE: u32 = 15;

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFStringCreateWithCString(alloc: CFTypeRef, cstr: *const c_char, encoding: u32) -> CFStringRef;
    fn CFNumberCreate(alloc: CFTypeRef, the_type: i32, value_ptr: *const c_void) -> CFNumberRef;
    fn CFDictionaryCreate(
        alloc: CFTypeRef,
        keys: *const CFTypeRef,
        values: *const CFTypeRef,
        num_values: i64,
        key_callbacks: *const c_void,
        value_callbacks: *const c_void,
    ) -> CFDictionaryRef;
    fn CFArrayGetCount(array: CFArrayRef) -> i64;
    fn CFArrayGetValueAtIndex(array: CFArrayRef, idx: i64) -> CFTypeRef;
    fn CFStringGetCString(string: CFStringRef, buffer: *mut c_char, buffer_size: i64, encoding: u32) -> bool;
    fn CFRelease(cf: CFTypeRef);
    static kCFAllocatorDefault: CFTypeRef;
    static kCFTypeDictionaryKeyCallBacks: c_void;
    static kCFTypeDictionaryValueCallBacks: c_void;
}

#[link(name = "IOKit", kind = "framework")]
extern "C" {
    fn IOHIDEventSystemClientCreate(alloc: CFTypeRef) -> IOHIDEventSystemClientRef;
    fn IOHIDEventSystemClientSetMatching(client: IOHIDEventSystemClientRef, matching: CFDictionaryRef);
    fn IOHIDEventSystemClientCopyServices(client: IOHIDEventSystemClientRef) -> CFArrayRef;
    fn IOHIDServiceClientCopyProperty(service: IOHIDServiceClientRef, key: CFStringRef) -> CFTypeRef;
    fn IOHIDServiceClientCopyEvent(service: IOHIDServiceClientRef, event_type: u32, event: IOHIDEventRef, options: u32) -> IOHIDEventRef;
    fn IOHIDEventGetFloatValue(event: IOHIDEventRef, field: u32) -> f64;
}

const K_CFSTRING_ENCODING_UTF8: u32 = 0x08000100;
const K_CFNUMBER_SINT32_TYPE: i32 = 3;

fn cfstr(s: &str) -> CFStringRef {
    let cstr = std::ffi::CString::new(s).unwrap();
    unsafe { CFStringCreateWithCString(kCFAllocatorDefault, cstr.as_ptr(), K_CFSTRING_ENCODING_UTF8) }
}

fn cfnum(value: u32) -> CFNumberRef {
    unsafe { CFNumberCreate(kCFAllocatorDefault, K_CFNUMBER_SINT32_TYPE, &value as *const u32 as *const c_void) }
}

pub struct IOHIDTemperatureSensors {
    client: IOHIDEventSystemClientRef,
}

impl IOHIDTemperatureSensors {
    pub fn new() -> Result<Self, String> {
        unsafe {
            // Create IOHID event system client
            let client = IOHIDEventSystemClientCreate(kCFAllocatorDefault);
            if client.is_null() {
                return Err("Failed to create IOHIDEventSystemClient".to_string());
            }
            
            // Create matching dictionary for Apple vendor temperature sensors
            let keys = [
                cfstr("PrimaryUsagePage"),
                cfstr("PrimaryUsage"),
            ];
            let values = [
                cfnum(K_HIDPAGE_APPLE_VENDOR) as CFTypeRef,
                cfnum(K_HIDUSAGE_APPLE_VENDOR_TEMPERATURE_SENSOR) as CFTypeRef,
            ];
            
            let matching = CFDictionaryCreate(
                kCFAllocatorDefault,
                keys.as_ptr() as *const CFTypeRef,
                values.as_ptr(),
                2,
                &kCFTypeDictionaryKeyCallBacks,
                &kCFTypeDictionaryValueCallBacks,
            );
            
            if matching.is_null() {
                return Err("Failed to create matching dictionary".to_string());
            }
            
            // Set matching criteria
            IOHIDEventSystemClientSetMatching(client, matching);
            CFRelease(matching);
            
            // Release the CFString and CFNumber objects
            for key in &keys {
                CFRelease(*key);
            }
            for value in &values {
                CFRelease(*value);
            }
            
            Ok(IOHIDTemperatureSensors { client })
        }
    }
    
    pub fn get_temperature_readings(&self) -> Result<Vec<(String, f64)>, String> {
        unsafe {
            let services = IOHIDEventSystemClientCopyServices(self.client);
            if services.is_null() {
                return Err("Failed to get IOHID services".to_string());
            }
            
            let service_count = CFArrayGetCount(services);
            println!("🔍 Found {} IOHID temperature services", service_count);
            
            let mut temperatures = Vec::new();
            
            for i in 0..service_count {
                let service = CFArrayGetValueAtIndex(services, i) as IOHIDServiceClientRef;
                
                // Get sensor name
                let product_key = cfstr("Product");
                let product_name = IOHIDServiceClientCopyProperty(service, product_key);
                CFRelease(product_key);
                
                let sensor_name = if !product_name.is_null() {
                    let mut buffer = [0i8; 256];
                    if CFStringGetCString(product_name as CFStringRef, buffer.as_mut_ptr(), 256, K_CFSTRING_ENCODING_UTF8) {
                        let cstr = CStr::from_ptr(buffer.as_ptr());
                        cstr.to_string_lossy().to_string()
                    } else {
                        format!("Sensor_{}", i)
                    }
                } else {
                    format!("Sensor_{}", i)
                };
                
                if !product_name.is_null() {
                    CFRelease(product_name);
                }
                
                println!("🔍 Processing sensor '{}' (index {})", sensor_name, i);
                
                // Get temperature reading using macmon's approach
                let event = IOHIDServiceClientCopyEvent(service, K_IOHIDEVENT_TYPE_TEMPERATURE, ptr::null_mut(), 0);
                if !event.is_null() {
                    // Use proper field value: K_IOHIDEVENT_TYPE_TEMPERATURE << 16
                    let field = K_IOHIDEVENT_TYPE_TEMPERATURE << 16;
                    let temperature = IOHIDEventGetFloatValue(event, field);
                    println!("🌡️  Raw temperature reading for '{}': {:.3}", sensor_name, temperature);
                    
                    if temperature > 0.0 && temperature < 150.0 {
                        println!("✅ Valid sensor '{}': {:.1}°C", sensor_name, temperature);
                        temperatures.push((sensor_name, temperature));
                    } else {
                        println!("❌ Invalid temperature for '{}': {:.3}°C (outside valid range)", sensor_name, temperature);
                    }
                    CFRelease(event);
                } else {
                    println!("❌ Failed to get temperature event for sensor '{}'", sensor_name);
                }
            }
            
            CFRelease(services);
            Ok(temperatures)
        }
    }
}

impl Drop for IOHIDTemperatureSensors {
    fn drop(&mut self) {
        unsafe {
            if !self.client.is_null() {
                CFRelease(self.client);
            }
        }
    }
}

// Temperature history tracking for trend analysis
pub struct TemperatureHistory {
    readings: Vec<(u64, f64)>, // (timestamp_ms, temperature)
    max_size: usize,
}

impl TemperatureHistory {
    pub fn new(max_size: usize) -> Self {
        Self {
            readings: Vec::with_capacity(max_size),
            max_size,
        }
    }
    
    pub fn add_reading(&mut self, timestamp: u64, temp: f64) {
        self.readings.push((timestamp, temp));
        if self.readings.len() > self.max_size {
            self.readings.remove(0);
        }
    }
    
    pub fn get_trend(&self, window_ms: u64) -> ThermalTrend {
        if self.readings.len() < 3 {
            return ThermalTrend::Stable;
        }
        
        let now = self.readings.last().unwrap().0;
        let recent: Vec<_> = self.readings
            .iter()
            .filter(|(ts, _)| now - ts <= window_ms)
            .collect();
            
        if recent.len() < 3 {
            return ThermalTrend::Stable;
        }
        
        let first_temp = recent[0].1;
        let last_temp = recent.last().unwrap().1;
        let temp_change = last_temp - first_temp;
        
        match temp_change {
            x if x > 5.0 => ThermalTrend::Rapid,
            x if x > 1.0 => ThermalTrend::Heating,
            x if x < -5.0 => ThermalTrend::Rapid,
            x if x < -1.0 => ThermalTrend::Cooling,
            _ => ThermalTrend::Stable,
        }
    }
}

pub async fn read_core_temperatures() -> Result<CoreTemperatureData, String> {
    println!("🔍 Starting IOHIDEventSystemClient temperature sensor detection...");
    
    let sensors = match IOHIDTemperatureSensors::new() {
        Ok(sensors) => {
            println!("✅ IOHIDEventSystemClient initialized successfully");
            sensors
        }
        Err(e) => {
            println!("❌ Failed to initialize IOHIDEventSystemClient: {}", e);
            return Err(format!("IOHID initialization failed: {}", e));
        }
    };
    
    let temperature_readings = match sensors.get_temperature_readings() {
        Ok(readings) => readings,
        Err(e) => {
            println!("❌ Failed to read temperature sensors: {}", e);
            return Err(format!("Temperature reading failed: {}", e));
        }
    };
    
    println!("📊 Found {} temperature sensors", temperature_readings.len());
    
    if temperature_readings.is_empty() {
        return Err("No temperature sensors found via IOHIDEventSystemClient".to_string());
    }
    
    // Categorize sensors by location (not actual core temperatures)
    let mut p_cores = Vec::new();
    let mut e_cores = Vec::new();
    let mut gpu_temps = Vec::new();
    let mut battery_sensors = Vec::new();
    let mut other_temps = Vec::new();
    
    println!("🔍 SENSOR CATEGORIZATION: Starting categorization of {} sensors...", temperature_readings.len());
    
    for (name, temp) in &temperature_readings {
        println!("🏷️  DETAILED: Categorizing sensor '{}': {:.1}°C", name, temp);
        
        // Categorize sensors by chip area based on naming patterns:
        if name.contains("pACC MTR Temp Sensor") || name.to_lowercase().contains("performance") {
            println!("   ⚡ MATCH: Performance area sensor -> adding {:.1}°C to p_cores", temp);
            p_cores.push(*temp);
        } else if name.contains("eACC MTR Temp Sensor") || name.to_lowercase().contains("efficiency") {
            println!("   🔋 MATCH: Efficiency area sensor -> adding {:.1}°C to e_cores", temp);
            e_cores.push(*temp);
        } else if name.contains("GPU MTR Temp Sensor") || name.to_lowercase().contains("gpu") {
            println!("   🎮 MATCH: GPU sensor -> adding {:.1}°C to gpu_temps", temp);
            gpu_temps.push(*temp);
        } else if name.contains("gas gauge battery") {
            println!("   🔋 MATCH: Battery sensor -> adding {:.1}°C to battery_sensors", temp);
            battery_sensors.push(*temp);
        } else if name.to_lowercase().contains("cpu") || name.to_lowercase().contains("core") || name.to_lowercase().contains("processor") {
            println!("   🏃 MATCH: Generic CPU sensor -> adding {:.1}°C to other_temps", temp);
            other_temps.push(*temp);
        } else {
            println!("   ❓ NO MATCH: Other sensor -> adding {:.1}°C to other_temps", temp);
            other_temps.push(*temp);
        }
    }
    
    println!("🔍 CATEGORIZATION RESULTS:");
    println!("   P-cores: {} sensors -> {:?}", p_cores.len(), p_cores);
    println!("   E-cores: {} sensors -> {:?}", e_cores.len(), e_cores);
    println!("   GPU: {} sensors -> {:?}", gpu_temps.len(), gpu_temps);
    println!("   Battery: {} sensors -> {:?}", battery_sensors.len(), battery_sensors);
    println!("   Other: {} sensors -> {:?}", other_temps.len(), other_temps);
    
    // If we couldn't categorize by names, use pattern-based heuristics
    if p_cores.is_empty() && e_cores.is_empty() && !other_temps.is_empty() {
        println!("🔍 No clear P/E-core categorization, using heuristic split");
        // Split roughly in half - typically more E-cores than P-cores
        let mid = other_temps.len() * 2 / 3; // First 2/3 as P-cores, rest as E-cores
        p_cores = other_temps[..mid.min(other_temps.len())].to_vec();
        e_cores = other_temps[mid.min(other_temps.len())..].to_vec();
    }
    
    // Calculate overall CPU statistics from all CPU sensors
    let all_cpu_temps: Vec<f64> = p_cores.iter().chain(e_cores.iter()).copied().collect();
    
    println!("🔍 CPU TEMPERATURE CALCULATION:");
    println!("   Combined CPU temps: {:?} (total {} values)", all_cpu_temps, all_cpu_temps.len());
    
    if all_cpu_temps.is_empty() {
        println!("❌ ERROR: No CPU temperature sensors found - cannot proceed");
        return Err("No CPU temperature sensors found".to_string());
    }
    
    let cpu_temp_avg = all_cpu_temps.iter().sum::<f64>() / all_cpu_temps.len() as f64;
    let cpu_temp_max = all_cpu_temps.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let cpu_temp_min = all_cpu_temps.iter().copied().fold(f64::INFINITY, f64::min);
    
    println!("   CPU temp_avg: {:.1}°C, temp_max: {:.1}°C, temp_min: {:.1}°C", cpu_temp_avg, cpu_temp_max, cpu_temp_min);
    
    // Calculate GPU temperature statistics
    println!("🔍 GPU TEMPERATURE CALCULATION:");
    println!("   GPU temps: {:?} (total {} values)", gpu_temps, gpu_temps.len());
    
    let gpu_temp_avg = if !gpu_temps.is_empty() {
        let avg = gpu_temps.iter().sum::<f64>() / gpu_temps.len() as f64;
        println!("   GPU temp_avg: {:.1}°C", avg);
        Some(avg)
    } else {
        println!("   GPU temp_avg: None (no GPU sensors found)");
        None
    };
    
    let gpu_temp_max = if !gpu_temps.is_empty() {
        let max = gpu_temps.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        println!("   GPU temp_max: {:.1}°C", max);
        Some(max)
    } else {
        println!("   GPU temp_max: None (no GPU sensors found)");
        None
    };
    
    // Calculate battery temperature average
    println!("🔍 BATTERY TEMPERATURE CALCULATION:");
    println!("   Battery temps: {:?} (total {} values)", battery_sensors, battery_sensors.len());
    
    let battery_temp_avg = if !battery_sensors.is_empty() {
        let avg = battery_sensors.iter().sum::<f64>() / battery_sensors.len() as f64;
        println!("   Battery temp_avg: {:.1}°C", avg);
        Some(avg)
    } else {
        println!("   Battery temp_avg: None (no battery sensors found)");
        None
    };
    
    println!("🌡️  Summary: avg={:.1}°C, max={:.1}°C, min={:.1}°C, p_cores={}, e_cores={}, gpu_temps={}, battery_sensors={}", 
             cpu_temp_avg, cpu_temp_max, cpu_temp_min, p_cores.len(), e_cores.len(), gpu_temps.len(), battery_sensors.len());
    
    println!("📊 Sensor breakdown:");
    for (name, temp) in &temperature_readings {
        println!("   🌡️  {}: {:.1}°C", name, temp);
    }
    
    Ok(CoreTemperatureData {
        p_cores,
        e_cores,
        cpu_temp_avg,
        cpu_temp_max,
        cpu_temp_min,
        gpu_temps: gpu_temps.clone(),
        gpu_temp_avg,
        gpu_temp_max,
        battery_temp_avg,
        thermal_trend: ThermalTrend::Stable, // Will be updated by history tracking
    })
}