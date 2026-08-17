# Prompt 200 — Missing Feature Backlog and Release Slice Plan

**Mode:** PLAN

## Objective
Use verified product behaviour and owner priorities to define the small set of missing features worth implementing before release.

## Inputs
- verified feature inventory;
- defect register;
- release blocker plan;
- owner-requested missing features when supplied;
- voice baseline;
- Play deadline/risk.

## Required output
For each proposed feature:
- problem/user value;
- current verified gap;
- release necessity: P0/P1/P2/P3;
- minimum complete scope;
- non-goals;
- architecture/data impact;
- UI/error/loading/permission states;
- migration/rollback impact;
- documentation delta;
- acceptance criteria;
- test cases;
- release risk and feature-flag/disable strategy.

## Recommendation
Select the smallest coherent pre-release set. Explicitly defer anything that increases risk disproportionately.

Do not implement.
