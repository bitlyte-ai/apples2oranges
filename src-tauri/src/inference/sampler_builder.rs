use llama_cpp_2::sampling::LlamaSampler;
use crate::ModelConfig;

pub struct SamplerBuilder;

impl SamplerBuilder {
    /// Creates a configured LlamaSampler from ModelConfig
    /// 
    /// CRITICAL: Follows llama.cpp standard sampling order:
    /// 1. Penalties (repeat, frequency, presence) - applied to raw logits
    /// 2. Top-K filtering - hard limit on candidate pool
    /// 3. Top-P filtering - dynamic vocabulary based on probability mass
    /// 4. Min-P filtering - relative probability threshold
    /// 5. Temperature scaling - controls randomness
    /// 6. Distribution sampling - final token selection
    /// 
    /// This order is important because each step affects the next.
    /// Changing the order can dramatically alter output quality.
    pub fn create_from_config(config: &ModelConfig) -> LlamaSampler {
        let mut sampler_chain = Vec::new();

        // Step 1: Apply penalties first (per llama.cpp standard order)
        // Rationale: Penalties modify logits before probability calculations
        let repeat_penalty = config.repeat_penalty.unwrap_or(1.0);
        let repeat_last_n = config.repeat_last_n.unwrap_or(64);
        let frequency_penalty = config.frequency_penalty.unwrap_or(0.0);
        let presence_penalty = config.presence_penalty.unwrap_or(0.0);

        // Only add penalties if any are actually enabled
        // Rationale: Avoid unnecessary computation for default disabled state
        if repeat_penalty != 1.0 || frequency_penalty != 0.0 || presence_penalty != 0.0 {
            println!("🎛️ Adding penalties: repeat={}, freq={}, presence={}, window={}",
                     repeat_penalty, frequency_penalty, presence_penalty, repeat_last_n);
            sampler_chain.push(LlamaSampler::penalties(
                repeat_last_n,      // Number of tokens to consider
                repeat_penalty,     // Base repetition penalty
                frequency_penalty,  // Frequency-based penalty
                presence_penalty,   // Presence-based penalty
            ));
        }

        // Step 2: Apply top_k filtering
        // Rationale: Top-K creates a hard limit before probability-based filtering
        if let Some(k) = config.top_k {
            if k > 0 {  // 0 means disabled
                println!("🎛️ Adding top-k filtering: k={}", k);
                sampler_chain.push(LlamaSampler::top_k(k));
            }
        }

        // Step 3: Apply top_p (nucleus sampling)
        // Rationale: More adaptive than top-k, adjusts vocabulary size dynamically
        if let Some(p) = config.top_p {
            if p > 0.0 && p < 1.0 {  // Must be valid probability
                println!("🎛️ Adding top-p filtering: p={}", p);
                sampler_chain.push(LlamaSampler::top_p(p, 1)); // min_keep = 1 ensures at least one token
            }
        }

        // Step 4: Apply min_p filtering
        // Rationale: Removes tokens that are too unlikely relative to the best option
        if let Some(p) = config.min_p {
            if p > 0.0 {
                println!("🎛️ Adding min-p filtering: p={}", p);
                sampler_chain.push(LlamaSampler::min_p(p, 1)); // min_keep = 1 ensures at least one token
            }
        }

        // Step 5: Apply temperature scaling
        // Rationale: Temperature affects the final probability distribution
        if let Some(temp) = config.temperature {
            if temp > 0.0 {
                println!("🎛️ Adding temperature scaling: temp={}", temp);
                sampler_chain.push(LlamaSampler::temp(temp));
            }
            // Note: temp = 0.0 would make greedy sampling, handled by final step
        }

        // Step 6: Add final distribution sampling for randomness
        // Rationale: Provides actual token selection from the filtered/scaled distribution
        println!("🎛️ Adding distribution sampling with fixed seed for reproducibility");
        sampler_chain.push(LlamaSampler::dist(1234)); // Fixed seed for reproducible results

        // Chain all samplers or fallback to greedy
        // Rationale: If no configuration provided, default to deterministic greedy sampling
        if sampler_chain.is_empty() {
            println!("🎛️ No sampling configuration provided, using greedy sampling");
            LlamaSampler::greedy()
        } else {
            println!("🎛️ Created sampler chain with {} components", sampler_chain.len());
            LlamaSampler::chain_simple(sampler_chain)
        }
    }

    /// Validates sampling configuration and returns warnings/errors
    /// 
    /// Rationale: Catch configuration errors early rather than failing during inference
    /// Provides user feedback about parameter ranges and conflicts
    pub fn validate_config(config: &ModelConfig) -> Vec<String> {
        let mut warnings = Vec::new();

        // Temperature validation
        if let Some(temp) = config.temperature {
            if temp < 0.0 {
                warnings.push("Temperature cannot be negative - using 0.0 for greedy sampling".to_string());
            } else if temp > 2.0 {
                warnings.push("Temperature > 2.0 may produce incoherent output".to_string());
            }
        }

        // Top-p validation
        if let Some(p) = config.top_p {
            if p <= 0.0 || p > 1.0 {
                warnings.push("Top-p must be between 0.0 and 1.0".to_string());
            }
        }

        // Min-p validation
        if let Some(p) = config.min_p {
            if p < 0.0 || p > 1.0 {
                warnings.push("Min-p must be between 0.0 and 1.0".to_string());
            }
        }

        // Top-k validation
        if let Some(k) = config.top_k {
            if k < 0 {
                warnings.push("Top-k cannot be negative - use 0 to disable".to_string());
            }
        }

        // Repetition penalty validation
        if let Some(penalty) = config.repeat_penalty {
            if penalty < 1.0 {
                warnings.push("Repeat penalty < 1.0 will increase repetition".to_string());
            } else if penalty > 1.5 {
                warnings.push("Repeat penalty > 1.5 may hurt coherence".to_string());
            }
        }

        // Cross-parameter conflict detection
        if let (Some(top_p), Some(min_p)) = (config.top_p, config.min_p) {
            if min_p > top_p {
                warnings.push("Min-p should typically be smaller than top-p".to_string());
            }
        }

        warnings
    }

    /// Provides a human-readable description of the sampling configuration
    /// 
    /// Rationale: Helps users understand what their configuration actually does
    pub fn describe_config(config: &ModelConfig) -> String {
        let mut description = Vec::new();

        if let Some(temp) = config.temperature {
            let creativity = if temp < 0.3 { "very low" }
                           else if temp < 0.7 { "low" }
                           else if temp < 1.0 { "moderate" }
                           else { "high" };
            description.push(format!("creativity: {} (temp: {})", creativity, temp));
        }

        if let Some(k) = config.top_k {
            if k > 0 {
                description.push(format!("vocabulary limited to top {} tokens", k));
            }
        }

        if let Some(p) = config.top_p {
            if p < 1.0 {
                description.push(format!("nucleus sampling at {:.0}%", p * 100.0));
            }
        }

        if let Some(penalty) = config.repeat_penalty {
            if penalty > 1.0 {
                let strength = if penalty < 1.05 { "light" }
                             else if penalty < 1.15 { "moderate" }
                             else { "strong" };
                description.push(format!("{} repetition penalty", strength));
            }
        }

        if description.is_empty() {
            "default configuration".to_string()
        } else {
            description.join(", ")
        }
    }
}