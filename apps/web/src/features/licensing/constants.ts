export const INSTANCE_LICENSE_TAG = "instance-license";
/**
 * Seat limit for self-hosted instances when no license is present: one,
 * unless UNLICENSED_SEAT_LIMIT raises it for an evaluation. Read from
 * process.env rather than `env` so importing this constant does not pull in
 * the whole runtime validation; env.ts still validates the value at boot.
 */
const unlicensedSeatLimit = Number(process.env.UNLICENSED_SEAT_LIMIT);
export const DEFAULT_SEAT_LIMIT =
  Number.isInteger(unlicensedSeatLimit) &&
  unlicensedSeatLimit >= 1 &&
  unlicensedSeatLimit <= 100
    ? unlicensedSeatLimit
    : 1;
