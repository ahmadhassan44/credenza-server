# Credenza - Fintech Platform

Credenza is a fintech platform that evaluates creditworthiness for digital creators by analyzing their platform metrics, income stability, and growth patterns.

## Modules

### Module 1: Data Collection Service
- Connects to various creator platforms (YouTube, Patreon, Instagram)
- Collects and stores relevant metrics data
- Periodically refreshes metrics to ensure up-to-date information
- Provides API endpoints for platform connectivity and data retrieval

### Module 2: Credit Scoring Engine
- Analyzes creator platform metrics to generate credit scores
- Implements sophisticated scoring algorithms for different content platforms
- Provides credit score history and trend analysis
- Automatically regenerates scores daily with new metrics

### Module 3: API Layer & Authentication
- Implements JWT-based authentication for secure API access
- Provides user registration and login functionality
- Enforces role-based access control for different user types
- Secures all endpoints with proper authorization checks

### Module 4: Frontend Dashboard
- Provides an intuitive user interface for creators to monitor creditworthiness
- Visualizes platform metrics and analytics with interactive charts
- Displays credit score history and trends
- Supports platform connection management
- Implements responsive design for all device sizes

## Tech Stack

- **Backend Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport.js
- **External APIs**: YouTube, Patreon, Instagram
- **Testing**: Jest
- **Infrastructure**: Docker
- **Frontend Framework**: Vue 3 with TypeScript
- **State Management**: Pinia
- **UI Components**: Tailwind CSS
- **Data Visualization**: Chart.js
- **Frontend Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js (v16+)
- Docker and Docker Compose
- PostgreSQL (or use the provided Docker container)

### Setup Instructions

1. Clone the repository:
```
git clone [repository-url]
cd credenza-backend
```

2. Set up environment variables:
```
cp .env.example .env
```
Then edit the `.env` file with your actual credentials.

3. Start the application with Docker:
```
docker-compose up -d
```

4. Generate Prisma client and run migrations:
```
npx prisma migrate dev --name init
```

5. The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication Endpoints (Module 3)

- **POST /api/v1/auth/register** - Register a new user
  - Body: `{ "email": "user@example.com", "password": "password", "firstName": "John", "lastName": "Doe" }`
  - Returns: User details

- **POST /api/v1/auth/login** - Log in with email and password
  - Body: `{ "email": "user@example.com", "password": "password" }`
  - Returns: Access token, refresh token, and user details

- **POST /api/v1/auth/refresh** - Refresh an expired access token
  - Body: `{ "refreshToken": "token" }`
  - Returns: New access token, refresh token, and user details

- **POST /api/v1/auth/logout** - Log out and invalidate tokens
  - Requires: Authorization header with valid JWT
  - Returns: Success message

- **GET /api/v1/auth/profile** - Get current user profile
  - Requires: Authorization header with valid JWT
  - Returns: User profile information

### User Management Endpoints (Module 3)

- **GET /api/v1/users/profile** - Get current user's profile
  - Requires: Authorization header with valid JWT
  - Returns: User details

- **PATCH /api/v1/users/profile** - Update current user's profile
  - Body: `{ "firstName": "John", "lastName": "Smith" }`
  - Requires: Authorization header with valid JWT
  - Returns: Updated user details

- **DELETE /api/v1/users/profile** - Delete current user's account
  - Requires: Authorization header with valid JWT
  - Returns: Success message

### Platform Endpoints (Module 1)

- **POST /api/v1/platforms/connect** - Connect a new platform for a creator
  - Body: `{ "type": "YOUTUBE", "creatorId": "user-id", "credentials": { ... } }`
  - Requires: Authorization header with valid JWT and CREATOR or ADMIN role
  - Returns: Platform data with initial metrics

- **GET /api/v1/platforms** - Get all connected platforms
  - Requires: Authorization header with valid JWT and ADMIN role
  - Returns: Array of platform objects

- **POST /api/v1/platforms/:id/refresh** - Manually trigger metrics refresh for a platform
  - Requires: Authorization header with valid JWT and CREATOR or ADMIN role
  - Returns: Array of new metrics collected

### Credit Scoring Endpoints (Module 2)

- **POST /api/v1/credit-scoring/generate/:creatorId** - Generate a new credit score for a creator
  - Requires: Authorization header with valid JWT and CREATOR or ADMIN role
  - Returns: Complete credit score with platform breakdowns

- **GET /api/v1/credit-scoring/latest/:creatorId** - Get the latest credit score for a creator
  - Requires: Authorization header with valid JWT and CREATOR or ADMIN role
  - Returns: Latest credit score with platform breakdowns

- **GET /api/v1/credit-scoring/history/:creatorId** - Get the credit score history for a creator
  - Requires: Authorization header with valid JWT and CREATOR or ADMIN role
  - Returns: Array of historical credit scores

## User Roles

Credenza implements role-based access control with the following roles:

- **USER**: Basic user with limited access
- **CREATOR**: Content creator with access to platform connections and credit scores
- **ADMIN**: Administrator with full access to all endpoints

## Development

### Running Tests

```
npm run test
```

### Documentation

API documentation is generated using Swagger and is available at `/api` when the application is running.

## Architecture

This service implements a modular architecture:

1. **Data Collection Service (Module 1)**
   - PlatformService: Core service handling platform integration
   - MetricsScheduler: Handles periodic metrics collection
   - PrismaService: Database access layer using Prisma ORM

2. **Credit Scoring Engine (Module 2)**
   - CreditScoringService: Implements credit scoring algorithms
   - CreditScoringScheduler: Handles daily score generation
   - Credit score data models: CreditScore, PlatformScore

3. **API Layer & Authentication (Module 3)**
   - AuthService: Handles authentication and token management
   - UserService: Manages user accounts and profiles
   - JWT & Role-based access control: Secures all API endpoints

## Scoring Methodology

The credit scoring engine analyzes several key factors:

- **Audience Size**: Number of followers/subscribers
- **Engagement**: Views, interactions, engagement rates
- **Income Level**: Earnings from various platforms
- **Income Stability**: Consistency of earnings over time
- **Growth Rate**: Rate of increase in followers and engagement

Each platform has different weights in the final scoring:
- Patreon: 50% (Most relevant for income stability)
- YouTube: 35% (Strong indicator of audience and engagement)
- Instagram: 15% (Supplemental audience indicator)

Scores range from 0-100, with higher scores indicating better creditworthiness.

## Next Steps

Upcoming modules:
- Module 4: Frontend Dashboard
- Module 5: Report Generation
````
