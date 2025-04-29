# Secure Web Application Project: Authentication, RBAC, and Best Practices

This project demonstrates the implementation of a secure web application featuring user registration, local login, Single Sign-On (SSO) via GitHub, Role-Based Access Control (RBAC), secure session management using JWTs, and best practices for protecting user profile data.

## Table of Contents

1.  [Features](#features)
2.  [Security Implementation Details](#security-implementation-details)
    *   [Authentication](#authentication)
    *   [Authorization (RBAC)](#authorization-rbac)
    *   [Session Management](#session-management)
    *   [Data Protection](#data-protection)
    *   [Vulnerability Mitigation](#vulnerability-mitigation)
3.  [Setting Up the Repository](#setting-up-the-repository)
4.  [Phase 2: Lessons Learned](#phase-2-lessons-learned)
5.  [Phase 3: Lessons Learned](#phase-3-lessons-learned)
6.  [Demonstration Video](#demonstration-video)
7.  [Attributions and References](#attributions-and-references)
8.  [Code of Conduct](#code-of-conduct)

## Features

*   **User Registration:** Secure local account creation.
*   **Local Authentication:** Login using email and password.
*   **Single Sign On Authentication:** Login/link account via GitHub OAuth 2.0.
*   **Secure Session Management:** Uses JSON Web Tokens (JWT) stored in HttpOnly cookies.
*   **Role-Based Access Control (RBAC):** Differentiates between `user` and `admin` roles.
*   **Protected Routes:** Backend and frontend routes restricted based on authentication status and user role.
*   **User Dashboard:** Displays user-specific information based on role.
*   **User Profile Management:** Secure form for users to view and update their profile (name, email, bio).
*   **Input Validation & Sanitization:** Protects against malicious form inputs.
*   **Output Encoding:** Prevents Cross-Site Scripting (XSS) when displaying user data.
*   **Data Encryption:** Encrypts sensitive profile data (email, bio) at rest using AES-256-GCM.
*   **HTTPS Enforcement:** Ensures data is encrypted in transit (requires SSL setup for development).
*   **Dependency Management & Security:** Includes practices for auditing and updating dependencies.
*   **Password Reset Functionality:** Secure flow for users to reset forgotten passwords via email. (Partially Implemented. Currently broken outside of development enviornment.)

## Security Implementation Details

### Authentication

*   **Local Authentication:**
    *   Passwords securely hashed using `bcrypt` with salting before storing in MongoDB.
*   **Single Sign On Authentication (GitHub):**
    *   Uses Passport.js `passport-github2` strategy.
    *   Handles linking GitHub profile to existing email accounts or creating new accounts.
    *   Stores GitHub ID (`githubId`) in the user schema.
*   **Password Reset:**
    *   Generates a cryptographically secure, time-limited (15 min) raw token.
    *   Hashes the token using `bcrypt` before storing it in the database alongside an expiry date.
    *   Sends the *raw* token to the user's email via Nodemailer (or logs it in dev console for dev environment *only works from profile currently*).
    *   Following are unimplmented:
        *   Verifies the raw token from the user against the stored hash upon reset attempt.
        *   Uses generic response messages for the request endpoint to prevent email enumeration.

### Authorization (RBAC)

*   **Roles:** `user` (default) and `admin` roles defined in the Mongoose `User` schema.
*   **Backend Middleware:**
    *   `authenticateJWT`: Verifies the JWT from the HttpOnly cookie and attaches the user object (including role) to `req.user`.
    *   `checkRole(allowedRoles)`: Middleware applied *after* `authenticateJWT` to specific routes, checking if `req.user.role` is included in the `allowedRoles` array. Denies access with a 403 Forbidden status if the role is not permitted.
*   **Frontend Route Protection:**
    *   `<ProtectedRoute allowedRoles={['admin']}>`: Wraps route components (e.g., in `app/routes/admin.tsx`) to enforce role-based access on the client-side, redirecting unauthorized users.

### Session Management

*   **JWT:** Uses `jsonwebtoken` library to sign and verify tokens.
*   **HttpOnly Cookies:** Stores the JWT securely in an `access_token` cookie, inaccessible to client-side JavaScript, mitigating XSS token theft.
*   **Cookie Security Attributes:** Configured with `secure: true` (in production), `httpOnly: true`, and `sameSite: 'strict'` for enhanced protection against CSRF and data leakage.
*   **Token Expiry:** JWTs have a defined expiration time (e.g., 15 minutes) managed by `jsonwebtoken`. *(Note: Refresh token mechanism might be needed for longer sessions but is not explicitly detailed here).*
*   **Session Fixation Prevention:** Inherently mitigated by generating a new JWT upon each successful login. Session ID regeneration is handled by the JWT mechanism itself.

### Data Protection

*   **Input Validation/Sanitization:**
    *   Uses `express-validator` on the backend for validating format (email, password length) and sanitizing inputs (trimming, escaping potentially harmful characters) for registration, login, profile updates, and password reset requests.
    *   Mongoose schema validation provides database-level type checking and constraints.
*   **Output Encoding:**
    *   Relies primarily on React's default JSX encoding to prevent XSS when rendering user-generated content (like username, bio) on the frontend.
    *   `helmet` middleware adds security headers (like `X-Content-Type-Options: nosniff`) as an additional layer.
*   **Encryption at Rest:**
    *   Sensitive fields (`bio`, `email` - *Note: Encrypting email might complicate lookups*) are encrypted using Node.js `crypto` module with AES-256-GCM before being saved to the database.
    *   A unique `ENCRYPTION_KEY` (32-byte hex string) stored in `.env` is required.
    *   A Mongoose `toJSON` transform automatically decrypts these fields when converting the document to JSON for API responses.
*   **Encryption in Transit:**
    *   Uses HTTPS (requires SSL certificate setup for local development) to encrypt all communication between the client and server.

### Vulnerability Mitigation

*   **CSRF Protection:**
    *   Uses `csurf` middleware with cookie storage.
    *   Requires a valid CSRF token (obtained via `/api/csrf-token`) to be sent in request headers (e.g., `CSRF-Token`) for state-changing requests (POST, PUT, DELETE) on protected routes.
*   **Rate Limiting:**
    *   Uses `express-rate-limit` to limit requests to authentication endpoints (`/api/auth/*`) and password reset endpoints (`/api/auth/request-password-reset`, `/api/auth/reset-password`) to prevent brute-force attacks.
*   **Dependency Security:**
    *   Uses `npm audit` for manual checks on push/PR with GitHub Actions.
*   **Account Enumeration Prevention:**
    *   Login and password reset request endpoints return generic error/success messages regardless of whether the email exists, preventing attackers from confirming valid email addresses.

## Setting Up the Repository

Follow these steps to get the project up and running on your local machine.

**Prerequisites:**

*   Node.js (v14 or higher recommended)
*   npm (or yarn)
*   MongoDB (local instance or cloud provider like MongoDB Atlas)
*   Git

**Steps:**

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd <repository_name>
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory by copying `.env.example`. Fill in the required values:
    ```env
    # Server Configuration
    PORT=3000
    NODE_ENV=development # or production
    FRONTEND_URL=https://localhost:5173 # Adjust if your frontend runs elsewhere

    # Security
    JWT_SECRET= # Generate a strong random string (e.g., using openssl rand -hex 32)
    ENCRYPTION_KEY= # Generate a 32-byte (64-char hex) key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

    # Database
    MONGO_URI= # Your MongoDB connection string

    # GitHub OAuth (Get from GitHub Developer Settings)
    GITHUB_CLIENT_ID=
    GITHUB_CLIENT_SECRET=

    # SSL Certificates (for local HTTPS development)
    # Generate using: openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
    SSL_KEY_PATH=./certs/key.pem
    SSL_CERT_PATH=./certs/cert.pem

    # Email (Optional - does not function, most of the mailer is commented out.)
    EMAIL_HOST=
    EMAIL_PORT=
    EMAIL_SECURE= # true or false
    EMAIL_USER=
    EMAIL_PASS=
    EMAIL_FROM=

    # Frontend Environment Variable (accessible via Vite)
    VITE_BACKEND_API_URL=https://localhost:3000 # Must match backend URL (including https if used. Mainly used to make sure the github SSO flow is able to track with the correct backend)
    ```

4.  **Generate SSL Certificates (for Development HTTPS):**
    If `NODE_ENV` is `development` and you want HTTPS, create the `certs` directory and generate self-signed certificates(this project includes some certs if you don't want to generate new ones for testing.):
    ```bash
    mkdir certs
    openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
    ```
    *Note: Browsers will show a warning for self-signed certificates.*
    *DO NOT USE ENCLUDED CERTS IN PRODUCTION. USE A TRUSTED CERTIFICATE AUTHORITY.*

5.  **Setup MongoDB:**
    Prepare a MongoDB URI to connect to the database.

6.  **Setup GitHub OAuth:**
    Create a GitHub OAuth app https://github.com/settings/developers and configure the `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` environment variables.
    Set the CALLBACK_URL to `https://localhost:3000/api/auth/github/callback` (if testing locally) or `https://your-domain.com/api/auth/github/callback` (if testing on a remote server).

7.  **Start the Application:**
    This command starts both the backend Node.js server and the frontend Vite development server concurrently.
    ```bash
    npm run dev
    ```

8.  **Access the Application:**
    Open your web browser and navigate to the `FRONTEND_URL` specified in your `.env` file (default: `https://localhost:5173`). Accept the browser warning for the self-signed certificate if using HTTPS locally.

---

## Phase 2: Lessons Learned

*   **Authentication Method Choice:**
    *   *After a lot of research I decided to go with passport.js for my authentication method, and bcrypt. These are well known for being secure and having solid options for interesting security configurations. I went for a rather simple configuration, and implmented bcrypt into the user schema in order to have sensetive data be encrypted before being sent to the database. *
    *   *Authentication was easy to get working at first but was a massive headache when I came back around to implementing JWT, and then again when implementing CSRF. I found myself creating logging and error tracking throughout the entire process.*

*   **RBAC Structure:**
    *   *I separated the roles into two roles. /admin /user which are managed through a database field. I separated actual protection into two levels, Backend route protection, and Frontend Route Protection with Conditional Rendering for uniques users. I ran into a few issues trying to get the protectedRoutes to allow desired acitivty through while implmenting CSRF, due to a token timing mismatch. I found that the user experience is slightly affected by small loading times, every time there is a server check. but otherwise I tried to make it so that users are never encountering fields they might accidentally be able to interact with that they do not have permission for.*
    *   *Overall this was my favorite thing to implment. It added a lot to the experience of exploring the dashboard from different account levels. There was something fun about testing both roles and having the extra button and menu show up. I now understand how so many webapps are able to dynamically serve a single URL that anyone can go to yet have there own personal context loaded specifically for them. A very nice UX things in my opinion.*

*   **JWT Storage and Management:**
    *   *I wanted to maximize JWT security and work with the HttpOnly header. Having a 15min expiry is interesting as there were times during development where I would experience the token expiring and trying to test around expired tokens. I found that it was difficult to implement CSRF along with tokens as it is difficult to track where the problems are happening.*
    *   *Overall, while one of my least favorite parts of this project I felt that it was a good balance of security and user experience.*

*   **Session Security Risks:**
    *   *I wasn't able to identify any security vulnerabilities with the time I had but I am certain there are some. I am pretty sure that there might be a vulnerability with the way the login method is currently implemented alongside github SSO. I think that someone could log in using a github account initially and then potentially force a log in through the unpopulated password field of the account... Possibly.*
## Phase 3: Lessons Learned

*   **Output Encoding for XSS:**
    *   *The primary defense is Output Encoding, as described above. By ensuring that any special characters in user input are converted to their HTML-safe equivalents before being rendered in the browser, we prevent malicious scripts from executing. I used the `escape()` function from the `express-validator` library to do this on all forms.*
    *   *This was quite easy to implement. I found it fun to build my validation array, which helped me feel more organized once I started connecting them to the different types of requests.*

*   **Encryption Challenges:**
    *   *Getting it to decrypt for display was faily simple once I had the encryption figured out. E? How did you resolve them?*
    *   *(Your reflection here...)*

*   **Dependency Management:**
    *   *Third party dependancies can have issues as the framework you use evolves. Sometimes dependencies that aren't updated to a compatible version can have specific vulnerabilities abusable by bad actors. I setup a github actions file using YAML in order to run npm audit on Push/PR in order to expose potential vulnerabilities that might be in the dependancies being used.*
    *   *This was a nice little break from spending quite a bit of time staring at typescript. Very simple to setup and good documentation, as with most things from github.*

## Phase 4: Lessons Learned

*   **Testing Strategy:**
    *   To test the robustness of our authentication and profile features, I primarily used **OWASP ZAP (Zed Attack Proxy)**. I ran ZAP's automated scanner against the running application to identify potential vulnerabilities like XSS and SQL injection.
    *   I focused on simulating the attack scenarios mentioned in the assignment, attempting to:
        *   Inject JavaScript into the username, email, and bio fields to test for **XSS**.
        *   Test the profile update form specifically to ensure that changing one user's data didn't accidentally affect another user.
    *   While ZAP is a powerful tool, there are definitely additional approaches that could improve security testing for a real-world application. Some ideas include:
        *   **Manual Penetration Testing:** A dedicated security professional could conduct more in-depth manual testing, looking for logical flaws or vulnerabilities that automated tools might miss.

    ---

## Ethical Responsibilities of Security Professionals

Thinking about how I tested the security in this project definitely made me consider the ethical side of things. When I was using ZAP and letting it the AJAX spider crawl my different endpoints, I was always doing it on my own local instance. This is super important – you only test on systems you're explicitly allowed to test on. Messing with someone else's website, even just to see if it's vulnerable, is illegal and completely unethical. Sticking to controlled environments like this project's local setup or authorized bug bounty programs keeps you on the right side of things and respects others' digital space. It's a key part of being a responsible security professional, or even just a developer who cares about security.

---

## Legal Implications of Security Testing

While this project is just a learning exercise, if it were a real web application handling user data, there would be some serious legal stuff to consider. Since I'm in Canada and my users might be anywhere, things like Canada's PIPEDA (Personal Information Protection and Electronic Documents Act) would apply, along with potentially GDPR (General Data Protection Regulation) if any users are in the EU. These laws basically say you have to protect user data, only collect what you need, and be transparent about what you're doing with it. My efforts to encrypt sensitive data, use HTTPS, and prevent unauthorized access are steps in the right direction to comply with these kinds of privacy regulations. If I were doing any sort of external security testing, I'd also need to be very aware of computer crime laws in the relevant jurisdictions – unauthorized access or damage is a big no-no and can lead to legal trouble.
