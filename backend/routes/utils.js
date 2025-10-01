// Shared utilities for route modules

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const toInt = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? d : n;
};

const buildPagination = (req) => {
  const page = Math.max(1, toInt(req.query.page, 1));
  const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const EPOCH = BigInt(1735689600000);
const WORKER_ID_BITS = BigInt(10);
const SEQUENCE_BITS = BigInt(12);

const MAX_WORKER_ID = (BigInt(1) << WORKER_ID_BITS) - BigInt(1); // 1023
const MAX_SEQUENCE = (BigInt(1) << SEQUENCE_BITS) - BigInt(1);   // 4095

const WORKER_ID_SHIFT = SEQUENCE_BITS; // 12
const TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS; // 22

const envWorker = Number(process.env.WORKER_ID || '1');
const workerId = BigInt(Math.max(0, Math.min(envWorker, Number(MAX_WORKER_ID))));

let lastTimestamp = BigInt(-1);
let sequence = BigInt(0);

function currentTimeMs() {
  return BigInt(Date.now());
}

function waitNextMillis(lastTs) {
  let ts = currentTimeMs();
  while (ts <= lastTs) {
    ts = currentTimeMs();
  }
  return ts;
}

function generateSnowflakeId() {
  let ts = currentTimeMs();

  if (ts < lastTimestamp) {
    ts = lastTimestamp;
  }

  if (ts === lastTimestamp) {
    sequence = (sequence + BigInt(1)) & MAX_SEQUENCE;
    if (sequence === BigInt(0)) {
      ts = waitNextMillis(lastTimestamp);
    }
  } else {
    sequence = BigInt(0);
  }

  lastTimestamp = ts;

  const id = ((ts - EPOCH) << TIMESTAMP_SHIFT) | (workerId << WORKER_ID_SHIFT) | sequence;
  return id.toString();
}

module.exports = {generateSnowflakeId , PASSWORD_REGEX, EMAIL_REGEX, toInt, buildPagination };
