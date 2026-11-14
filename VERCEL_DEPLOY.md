# Vercel — Preview Only (Nexora Cloud)

This repository now targets a private self-hosted deployment for actual Nexora Cloud operations. Do not deploy the production database or administrative control plane to Vercel Hobby.

Vercel's current Hobby terms restrict the plan to personal/non-commercial use and reserve the right to disable Hobby deployments. Nexora Cloud is part of the Razzaq Ventures business ecosystem; therefore Hobby is not an approved production dependency.

A Vercel preview may be used only for a non-commercial UI demo if the applicable terms permit it. Do not connect a preview deployment to production secrets or the private Nexora database. Do not put `NEXORA_ADMIN_TOKEN` or project API keys in client-visible or `NEXT_PUBLIC_` variables.

For the private operational deployment, follow `docs/PRIVATE-ZERO-COST-ARCHITECTURE.md` and `README.md` on hardware already owned by the owner.
