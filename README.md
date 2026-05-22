# Task Manager API

A production-grade REST API built with Node.js and Express.
This repository follows a complete DevOps workflow across 6 phases.

## API Endpoints

| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| GET    | /health               | Health check         |
| POST   | /api/auth/register    | Register user        |
| POST   | /api/auth/login       | Login, get JWT       |
| GET    | /api/tasks            | List all tasks       |
| POST   | /api/tasks            | Create task          |
| GET    | /api/tasks/:id        | Get one task         |
| PUT    | /api/tasks/:id        | Update task          |
| DELETE | /api/tasks/:id        | Delete task          |

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/taskmanager-devops.git
cd taskmanager-devops
cp .env.example .env       # fill in your values
npm install
npm run dev
```

## Branching Strategy

- `main` — production only, protected, no direct pushes
- `develop` — integration branch, all features merge here
- `feature/*` — new features, branch from develop
- `hotfix/*` — critical fixes, branch from main

## DevOps Stack

| Phase | Tools |
|-------|-------|
| 1 | Git, GitHub, GitLab |
| 2 | Docker, docker-compose |
| 3 | GitHub Actions, Jenkins, CircleCI, SonarQube |
| 4 | Terraform, Ansible, HashiCorp Vault |
| 5 | Kubernetes |
| 6 | Prometheus, Grafana, ELK Stack |
