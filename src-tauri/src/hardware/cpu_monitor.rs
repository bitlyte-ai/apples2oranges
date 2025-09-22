// Contains CpuUtilizationMonitor and Apple Silicon detection system

use std::time::Duration;
use std::ffi::CString;
use std::collections::HashMap;
use sysinfo::System;

#[cfg(target_os = "macos")]
use libc::{sysctlbyname, size_t};
use std::ffi::c_void;

// Apple Silicon P-core/E-core detection infrastructure
#[cfg(target_os = "macos")]
mod apple_silicon_detection {
    use super::*;

    /// Safely retrieve a u32 value from macOS sysctl
    /// Returns None if the sysctl key doesn't exist or value is invalid
    pub fn get_sysctl_u32(name: &str) -> Option<u32> {
        let c_name = match CString::new(name) {
            Ok(cstring) => cstring,
            Err(_) => {
                println!("❌ sysctl: Invalid key name '{}'", name);
                return None;
            }
        };

        let mut value: u32 = 0;
        let mut size: size_t = std::mem::size_of::<u32>();

        let result = unsafe {
            sysctlbyname(
                c_name.as_ptr(),
                &mut value as *mut u32 as *mut c_void,
                &mut size,
                std::ptr::null_mut(),
                0
            )
        };

        if result == 0 && size == std::mem::size_of::<u32>() {
            Some(value)
        } else {
            None
        }
    }

    /// Safely retrieve a string value from macOS sysctl
    /// Returns None if the sysctl key doesn't exist or string is invalid
    pub fn get_sysctl_string(name: &str) -> Option<String> {
        let c_name = match CString::new(name) {
            Ok(cstring) => cstring,
            Err(_) => {
                println!("❌ sysctl: Invalid key name '{}'", name);
                return None;
            }
        };

        let mut size: size_t = 0;

        // First call to get required buffer size
        let result = unsafe {
            sysctlbyname(
                c_name.as_ptr(),
                std::ptr::null_mut(),
                &mut size,
                std::ptr::null_mut(),
                0
            )
        };

        if result != 0 || size == 0 {
            return None;
        }

        // Allocate buffer and get the actual string
        let mut buffer: Vec<u8> = vec![0; size];
        let result = unsafe {
            sysctlbyname(
                c_name.as_ptr(),
                buffer.as_mut_ptr() as *mut c_void,
                &mut size,
                std::ptr::null_mut(),
                0
            )
        };

        if result == 0 {
            // Remove null terminator if present
            if let Some(null_pos) = buffer.iter().position(|&x| x == 0) {
                buffer.truncate(null_pos);
            }

            match String::from_utf8(buffer) {
                Ok(string) => Some(string),
                Err(_) => {
                    println!("❌ sysctl: Invalid UTF-8 in string for key '{}'", name);
                    None
                }
            }
        } else {
            None
        }
    }
}

// Non-macOS platforms: provide stub implementations
#[cfg(not(target_os = "macos"))]
mod apple_silicon_detection {
    pub fn get_sysctl_u32(_name: &str) -> Option<u32> {
        None
    }

    pub fn get_sysctl_string(_name: &str) -> Option<String> {
        None
    }
}

// Apple Silicon configuration database and detection types
#[derive(Debug, Clone)]
pub struct AppleSiliconInfo {
    pub chip_name: String,
    pub total_cores: usize,
    pub p_cores: usize,
    pub e_cores: usize,
    pub detection_method: DetectionMethod,
}

#[derive(Debug, Clone)]
pub enum DetectionMethod {
    SysctlDynamic,        // Primary: hw.perflevel0/1.physicalcpu
    ChipLookup,           // Enhanced fallback: chip name + core count
    TotalCountHeuristic,  // Final fallback: current logic
}

lazy_static::lazy_static! {
    static ref APPLE_SILICON_CONFIGS: HashMap<(String, usize), (usize, usize)> = {
        let mut configs = HashMap::new();

        // M1 Series (2020-2022)
        configs.insert(("M1".to_string(), 8), (4, 4));                    // Base M1
        configs.insert(("M1 Pro".to_string(), 8), (6, 2));               // M1 Pro 8-core
        configs.insert(("M1 Pro".to_string(), 10), (8, 2));              // M1 Pro 10-core
        configs.insert(("M1 Max".to_string(), 10), (8, 2));              // M1 Max
        configs.insert(("M1 Ultra".to_string(), 20), (16, 4));           // M1 Ultra

        // M2 Series (2022-2023)
        configs.insert(("M2".to_string(), 8), (4, 4));                   // Base M2
        configs.insert(("M2 Pro".to_string(), 10), (6, 4));              // M2 Pro 10-core
        configs.insert(("M2 Pro".to_string(), 12), (8, 4));              // M2 Pro 12-core
        configs.insert(("M2 Max".to_string(), 12), (8, 4));              // M2 Max
        configs.insert(("M2 Ultra".to_string(), 24), (16, 8));           // M2 Ultra

        // M3 Series (2023)
        configs.insert(("M3".to_string(), 8), (4, 4));                   // Base M3
        configs.insert(("M3 Pro".to_string(), 11), (5, 6));              // M3 Pro 11-core
        configs.insert(("M3 Pro".to_string(), 12), (6, 6));              // M3 Pro 12-core
        configs.insert(("M3 Max".to_string(), 14), (10, 4));             // M3 Max 14-core (binned)
        configs.insert(("M3 Max".to_string(), 16), (12, 4));             // M3 Max 16-core (full)
        // Note: M3 Ultra was cancelled by Apple

        // M4 Series (2024)
        configs.insert(("M4".to_string(), 9), (3, 6));                   // M4 9-core (binned)
        configs.insert(("M4".to_string(), 10), (4, 6));                  // M4 10-core (full)
        configs.insert(("M4 Pro".to_string(), 12), (8, 4));              // M4 Pro 12-core
        configs.insert(("M4 Pro".to_string(), 14), (10, 4));             // M4 Pro 14-core
        configs.insert(("M4 Max".to_string(), 14), (10, 4));             // M4 Max 14-core (binned)
        configs.insert(("M4 Max".to_string(), 16), (12, 4));             // M4 Max 16-core (full)

        // Future-proofing: Expected M4 Ultra configurations
        configs.insert(("M4 Ultra".to_string(), 28), (20, 8));           // Expected M4 Ultra
        configs.insert(("M4 Ultra".to_string(), 32), (24, 8));           // Expected M4 Ultra variant

        configs
    };
}

// Chip detection and parsing functions
fn get_apple_chip_name() -> Option<String> {
    let brand_string = apple_silicon_detection::get_sysctl_string("machdep.cpu.brand_string")?;
    parse_apple_chip_model(&brand_string)
}

fn parse_apple_chip_model(brand_string: &str) -> Option<String> {
    // Parse strings like "Apple M3 Max", "Apple M4 Pro", "Apple M2"
    if let Some(chip_part) = brand_string.strip_prefix("Apple ") {
        // Validate it looks like an Apple Silicon chip name
        if chip_part.starts_with('M') && chip_part.len() >= 2 {
            // Extract just the chip model (e.g., "M3 Max" from "Apple M3 Max")
            Some(chip_part.to_string())
        } else {
            println!("⚠️  Unrecognized Apple chip format: '{}'", brand_string);
            None
        }
    } else {
        // Not an Apple Silicon chip (probably Intel)
        None
    }
}

// Primary sysctl-based detection
fn try_sysctl_detection() -> Option<(usize, usize)> {
    let p_cores = apple_silicon_detection::get_sysctl_u32("hw.perflevel0.physicalcpu")? as usize;
    let e_cores = apple_silicon_detection::get_sysctl_u32("hw.perflevel1.physicalcpu")? as usize;

    // Validate results are reasonable for Apple Silicon
    if p_cores > 0 && e_cores > 0 && p_cores <= 24 && e_cores <= 8 && (p_cores + e_cores) <= 32 {
        Some((p_cores, e_cores))
    } else {
        println!("⚠️  sysctl returned invalid core counts: {}P + {}E", p_cores, e_cores);
        None
    }
}

// Enhanced fallback using chip name + core count lookup
fn try_chip_lookup_detection(total_cores: usize) -> Option<(usize, usize, String)> {
    let chip_name = get_apple_chip_name()?;

    if let Some((p_cores, e_cores)) = APPLE_SILICON_CONFIGS.get(&(chip_name.clone(), total_cores)) {
        Some((*p_cores, *e_cores, chip_name))
    } else {
        println!("⚠️  Unknown Apple Silicon configuration: {} with {} cores", chip_name, total_cores);
        None
    }
}

// Final fallback using enhanced total core count heuristic
fn fallback_core_count_detection(total_cores: usize) -> (usize, usize) {
    match total_cores {
        8 => (4, 4),   // M1, M2, M3 base models
        9 => (3, 6),   // M4 base (binned)
        10 => (4, 6),  // M1 Pro, M4 base (full)
        11 => (5, 6),  // M3 Pro (binned)
        12 => (8, 4),  // M2 Pro/Max, M3 Pro (full), M4 Pro (binned)
        14 => (10, 4), // M3 Max (binned), M4 Pro/Max
        16 => (12, 4), // M3/M4 Max (full)
        20 => (16, 4), // M1 Ultra
        24 => (16, 8), // M2 Ultra
        28 => (20, 8), // Expected M4 Ultra
        32 => (24, 8), // Expected M4 Ultra variant
        _ => {
            // Unknown configuration - use intelligent 60/40 split favoring P-cores
            // (Apple Silicon typically has more P-cores than E-cores)
            let p_cores = (total_cores * 3) / 5; // 60% P-cores
            let e_cores = total_cores - p_cores;
            println!("⚠️  Unknown core configuration: {} cores, using heuristic: {}P + {}E",
                     total_cores, p_cores, e_cores);
            (p_cores, e_cores)
        }
    }
}

// Validation function for testing detection logic (debug builds only)
#[cfg(debug_assertions)]
pub fn validate_detection_system() {
    println!("🧪 Running Apple Silicon detection validation...");

    // Test chip name parsing
    assert_eq!(parse_apple_chip_model("Apple M3 Max"), Some("M3 Max".to_string()));
    assert_eq!(parse_apple_chip_model("Apple M4"), Some("M4".to_string()));
    assert_eq!(parse_apple_chip_model("Intel Core i7"), None);

    // Test configuration lookups
    let test_cases = vec![
        ("M3 Max", 14, Some((10, 4))),
        ("M3 Max", 16, Some((12, 4))),
        ("M4 Pro", 12, Some((8, 4))),
        ("M4 Pro", 14, Some((10, 4))),
        ("Unknown", 99, None),
    ];

    for (chip, cores, expected) in test_cases {
        let result = APPLE_SILICON_CONFIGS.get(&(chip.to_string(), cores)).map(|(p, e)| (*p, *e));
        assert_eq!(result, expected, "Failed for {} with {} cores", chip, cores);
    }

    println!("✅ All detection system validations passed!");
}

// Main three-tier Apple Silicon detection system
pub fn detect_apple_silicon_configuration(total_cores: usize) -> AppleSiliconInfo {
    println!("🔍 Starting Apple Silicon detection for {} total cores", total_cores);

    // TIER 1: Primary sysctl-based detection
    if let Some((p_cores, e_cores)) = try_sysctl_detection() {
        let chip_name = get_apple_chip_name().unwrap_or_else(|| "Apple Silicon".to_string());
        println!("✅ Tier 1 SUCCESS: Dynamic sysctl detection");
        println!("   📊 Detected: {} ({} total cores) → {}P + {}E cores",
                 chip_name, total_cores, p_cores, e_cores);

        return AppleSiliconInfo {
            chip_name,
            total_cores,
            p_cores,
            e_cores,
            detection_method: DetectionMethod::SysctlDynamic,
        };
    }
    println!("❌ Tier 1 FAILED: sysctl detection unavailable");

    // TIER 2: Enhanced fallback using chip name + core count lookup
    if let Some((p_cores, e_cores, chip_name)) = try_chip_lookup_detection(total_cores) {
        println!("✅ Tier 2 SUCCESS: Chip lookup detection");
        println!("   📊 Matched: {} ({} total cores) → {}P + {}E cores",
                 chip_name, total_cores, p_cores, e_cores);

        return AppleSiliconInfo {
            chip_name,
            total_cores,
            p_cores,
            e_cores,
            detection_method: DetectionMethod::ChipLookup,
        };
    }
    println!("❌ Tier 2 FAILED: No chip+core count match found");

    // TIER 3: Final fallback using enhanced total core count heuristic
    let (p_cores, e_cores) = fallback_core_count_detection(total_cores);
    let chip_name = get_apple_chip_name().unwrap_or_else(|| "Unknown Apple Silicon".to_string());

    println!("⚠️  Tier 3 FALLBACK: Using core count heuristic");
    println!("   📊 Estimated: {} ({} total cores) → {}P + {}E cores",
             chip_name, total_cores, p_cores, e_cores);

    AppleSiliconInfo {
        chip_name,
        total_cores,
        p_cores,
        e_cores,
        detection_method: DetectionMethod::TotalCountHeuristic,
    }
}

// CPU utilization monitoring using sysinfo
pub struct CpuUtilizationMonitor {
    system: System,
    p_core_count: usize,
    e_core_count: usize,
}

impl CpuUtilizationMonitor {
    pub fn new() -> Self {
        let mut system = System::new();
        system.refresh_cpu_specifics(sysinfo::CpuRefreshKind::everything());

        let total_cores = system.cpus().len();

        // Run validation in debug builds
        #[cfg(debug_assertions)]
        validate_detection_system();

        // Use enhanced three-tier Apple Silicon detection system
        let silicon_info = detect_apple_silicon_configuration(total_cores);

        println!("🔍 CPU Utilization Monitor initialized:");
        println!("   📱 Chip: {} ({} total cores)", silicon_info.chip_name, total_cores);
        println!("   ⚡ Configuration: {} P-cores + {} E-cores", silicon_info.p_cores, silicon_info.e_cores);
        println!("   🔧 Detection method: {:?}", silicon_info.detection_method);

        Self {
            system,
            p_core_count: silicon_info.p_cores,
            e_core_count: silicon_info.e_cores,
        }
    }
    
    pub async fn get_cpu_utilization(&mut self) -> (Vec<f64>, Vec<f64>, f64) {
        println!("🔍 CPU UTILIZATION: Starting measurement...");
        
        // Take first measurement
        println!("   📊 Taking first measurement...");
        self.system.refresh_cpu_specifics(sysinfo::CpuRefreshKind::everything());
        
        // Wait briefly for measurement interval
        println!("   ⏰ Waiting 200ms for measurement interval...");
        tokio::time::sleep(Duration::from_millis(200)).await;
        
        // Take second measurement to calculate utilization
        println!("   📊 Taking second measurement...");
        self.system.refresh_cpu_specifics(sysinfo::CpuRefreshKind::everything());
        
        let cpus = self.system.cpus();
        let mut p_core_utils = Vec::new();
        let mut e_core_utils = Vec::new();
        let mut total_utilization = 0.0;
        
        println!("   📈 Processing {} CPU cores (P-cores: {}, E-cores: {})", 
                 cpus.len(), self.p_core_count, self.e_core_count);
        
        // Split cores based on Apple Silicon architecture:
        // In Apple Silicon, E-cores (efficiency) come first in enumeration (cores 0-N),
        // followed by P-cores (performance) in the higher indices
        for (i, cpu) in cpus.iter().enumerate() {
            let utilization = cpu.cpu_usage() as f64;
            total_utilization += utilization;
            
            if i < self.e_core_count {
                println!("      Core {}: {:.1}% utilization -> E-core", i, utilization);
                e_core_utils.push(utilization);
            } else {
                println!("      Core {}: {:.1}% utilization -> P-core", i, utilization);
                p_core_utils.push(utilization);
            }
        }
        
        let overall_utilization = total_utilization / cpus.len() as f64;
        
        println!("   📈 UTILIZATION RESULTS:");
        println!("      P-core utilizations: {:?}", p_core_utils);
        println!("      E-core utilizations: {:?}", e_core_utils);
        println!("      Overall utilization: {:.1}%", overall_utilization);
        
        (p_core_utils, e_core_utils, overall_utilization)
    }
}