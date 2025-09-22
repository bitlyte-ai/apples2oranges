// Existing modules
pub mod generation;

// New module for sampling configuration
pub mod sampler_builder;

// Existing exports
pub use generation::run_model_inference;

// New exports for sampling functionality
pub use sampler_builder::SamplerBuilder;
