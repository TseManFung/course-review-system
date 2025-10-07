// Centralized ID type aliases to avoid accidental number usage.
// All Snowflake / BIGINT identifiers MUST be treated as opaque strings.
// Never cast to number; JavaScript numbers cannot safely represent >53-bit integers.

export type SnowflakeId = string; // reviewId, instructorId, encouragementId, etc.
export type CourseId = string;    // e.g. COMP1010
export type SemesterId = string;  // e.g. 2024sem1
export type UserId = string;      // student login ID
