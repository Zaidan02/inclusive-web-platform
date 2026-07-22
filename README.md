# Inclusive Employment Platform

> A Final Year Project in Computer Engineering focused on improving disability inclusion in employment through ability-based and task-based candidate–job matching.

---

## Table of Contents

- [Introduction](#introduction)
- [Project Objectives](#project-objectives)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
- [User Roles](#user-roles)
- [Local Installation](#local-installation)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Docker Setup](#docker-setup)
- [Authentication System](#authentication-system)
- [Email Verification](#email-verification)
- [AI Matching Module](#ai-matching-module)
- [Database Overview](#database-overview)
- [Deployment](#deployment)
- [Known Issues & Lessons Learned](#known-issues--lessons-learned)
- [Future Improvements](#future-improvements)
- [Team Contributions](#team-contributions)
- [Acknowledgements](#acknowledgements)

---

## Introduction

Traditional employment platforms generally evaluate candidates based on job titles, qualifications, or disability labels. Through field research and discussions with organizations supporting people with disabilities, it became clear that employment barriers are often caused by employers being unable to visualize what a candidate can actually do.

This platform was designed around the concept of **remaining functional abilities** rather than disabilities. Jobs are decomposed into tasks, tasks are associated with required abilities, and candidates are evaluated according to their capabilities. An AI-based matching engine then generates compatibility evaluations between candidates and available jobs.

The platform contains dedicated interfaces for **candidates**, **employers**, and **administrators**, and includes authentication, profile management, job posting, application management, and AI-powered compatibility assessment.

---

## Project Objectives

- Help employers understand candidate capabilities through task-based evaluations.
- Provide candidates with personalized compatibility assessments.
- Reduce bias associated with disability labels.
- Encourage employers to focus on abilities rather than limitations.
- Create a scalable digital platform that can be extended in future research or commercial initiatives.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, React Router, Axios |
| **Backend** | Symfony, API Platform, Doctrine ORM, JWT Authentication |
| **Database** | PostgreSQL |
| **AI** | Python, Scikit-Learn, Gradient Boosting Regressor |
| **Email** | SendGrid, Symfony Mailer |
| **Deployment** | Render |
| **Dev Environment** | Docker, Docker Compose |
| **Version Control** | Git, GitHub |

---

## System Architecture

The application follows a **client-server architecture**.

```
User → React Frontend → Symfony API → PostgreSQL Database
```

For compatibility calculations:

```
User Data + Job Requirements → AI Model → Compatibility Score → Frontend Display
```

- The **frontend** handles user interaction and communicates with the backend via REST APIs.
- The **Symfony backend** contains business logic, authentication, compatibility calculations, and database interactions.
- The **PostgreSQL database** stores all persistent data: users, jobs, tasks, abilities, applications, and compatibility data.
- The **AI module** is trained separately and provides compatibility predictions based on collected datasets.

---

## Repository Structure

```
├── ai_service/
│   ├── app.py
│   ├── model_compatibility...
│   ├── model_constant...
│   ├── model_remaining...
│   └── requirements.txt
│
├── backend/
│   ├── bin/
│   ├── config/
│   ├── migrations/
│   ├── public/
│   ├── src/
│   ├── templates/
│   ├── .editorconfig
│   ├── .env
│   ├── .env.dev
│   ├── .gitignore
│   ├── compose.override...
│   ├── compose.yaml
│   ├── composer.json
│   ├── composer.lock
│   ├── Dockerfile
│   ├── Dockerfile.render
│   └── symfony.lock
│
├── frontend/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   └── vite.config.js
│
└── database.sql
```

---

## User Roles

### Candidate
- Register and verify their account.
- Complete their profile and functional assessments.
- Browse jobs and view compatibility evaluations.
- Submit applications.

### Employer
- Create and manage job postings.
- Define tasks associated with jobs.
- Review applications and view compatibility evaluations.

### Administrator
- Manage users, jobs, tasks, and abilities.
- Monitor platform activity and resolve content issues.

---

## Local Installation

### Prerequisites

Ensure the following software is installed before proceeding:

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) v18 or later
- [Composer](https://getcomposer.org/)
- PHP 8.2 or later
- PostgreSQL 14

---

### Backend Setup

```bash
# Navigate to the backend folder
cd fyp-backend

# Install dependencies
composer install

# Create a local environment file
cp .env .env.local
```

Configure the database connection in `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/inclusive_platform?serverVersion=14&charset=utf8"
```

```bash
# Generate JWT keys
php bin/console lexik:jwt:generate-keypair

# Create the database
php bin/console doctrine:database:create

# Run migrations
php bin/console doctrine:migrations:migrate

# Start the backend
symfony server:start
```

The API will be available at: `http://localhost:8000`

---

### Frontend Setup

```bash
# Navigate to the frontend folder
cd fyp-frontend

# Install dependencies
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8000/api
```

```bash
# Start the application
npm run dev
```

The frontend will be available at: `http://localhost:5173`

---

### Docker Setup

```bash
# Build the containers
docker compose build

# Start containers
docker compose up -d

# Stop containers
docker compose down
```

Docker automatically starts the Symfony backend and PostgreSQL database. It is **strongly recommended** for consistent development environments.

---

## Authentication System

Authentication is handled through **JWT tokens**.

1. User submits credentials.
2. Symfony validates and generates a JWT token.
3. The token is returned to and stored by the frontend.
4. Every protected request includes the token in its headers.
5. Protected routes verify the token before granting access.

Role-based authorization separates candidate, employer, and administrator functionality.

---

## Email Verification

Email verification is handled through **SendGrid**.

1. A verification token is generated on registration.
2. A verification email is sent to the user.
3. The user clicks the verification link.
4. The backend validates the token and marks the account as verified.

Required environment variables:

```env
MAILER_DSN=
SENDGRID_API_KEY=
```

> Email verification will fail if SendGrid sender identities are not verified in your SendGrid account.

---

## AI Matching Module

The matching engine uses a **Gradient Boosting Regressor**, selected after evaluating several algorithms during experimentation.

- **R² Score:** ~0.986 on the available dataset.
- The model predicts functional abilities and contributes to compatibility score calculations.

Training data consists of structured records containing:
- Functional ability indicators
- Job and task requirements
- Compatibility outcomes

**To retrain the model:**

```bash
python train_model.py
```

Replace the existing file in the `AI/models/` directory with the newly generated model file.

---

## Database Overview

| Entity | Description |
|---|---|
| **Users** | Authentication and profile information |
| **Jobs** | Employer-created job opportunities |
| **Tasks** | Detailed work activities associated with jobs |
| **Abilities** | Functional abilities required to perform tasks |
| **Applications** | Candidate submissions |
| **Compatibility Evaluations** | Generated matching results |

Relationships are managed using **Doctrine ORM**. Future teams are encouraged to review Entity definitions before modifying the schema.

---

## Deployment

The platform was deployed using **[Render](https://render.com)**.

| Service | Description |
|---|---|
| Backend Service | Symfony API |
| Frontend Service | React Application |
| Database Service | PostgreSQL |

Deployment requires:
- Environment variables
- Database configuration
- SendGrid configuration
- JWT keys

Future teams may redeploy using Render, Railway, AWS, Azure, or any compatible cloud provider.

---

## Known Issues & Lessons Learned

- **PostgreSQL version mismatch** — The server version must match what is specified in `DATABASE_URL`. A mismatch will cause migration errors.
- **JWT keys** — Must be generated before authentication can function.
- **Environment variables** — Must be fully configured before deployment.
- **SendGrid sender identity** — Must be verified or email verification will fail.
- **Foreign key relationships** — Review carefully before deleting any entities to avoid cascade issues.
- **Docker** — Strongly recommended for development consistency.

---

## Future Improvements

- Arabic language support
- Mobile application development
- Advanced explainable AI features
- Employer analytics dashboards
- Interview scheduling functionality
- Recommendation systems
- Expanded datasets for AI training
- NGO integration
- Accessibility enhancements

---

## Team Contributions

This project was developed as part of a Final Year Project in Computer Engineering.

> Future teams should update this section with their own contributions and modifications to maintain project continuity.

---

## Acknowledgements

We would like to thank our academic supervisors, participating organizations, employers, and **Arc-en-Ciel** for their support, insights, and contributions throughout the development of this project. Their feedback significantly influenced the design philosophy and practical direction of the platform.

---

> **Note for future teams:** Before making major modifications, first understand the relationship between **jobs, tasks, abilities, and compatibility calculations** — these concepts form the core foundation of the platform. Any future development should preserve the original objective of evaluating individuals based on their abilities and potential contributions rather than limitations.

