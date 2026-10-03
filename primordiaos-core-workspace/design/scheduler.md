# Scheduler

## Purpose
Route jobs to realms and agents based on priority and affinity.

## Responsibilities
- Maintain job queue.
- Support priorities.
- Realm affinity routing.
- Backpressure handling.

## Interfaces
- API: enqueue(job), dequeue().
- Job: { id, realm, priority, payload }.
- Emits: job.enqueued, job.dequeued.

## Constraints
- Must be deterministic in ordering.
- Must be safe under high load.
