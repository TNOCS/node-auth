# node-auth
User management node-express-mongodb middleware

node-auth is an express middleware for authentication, which creates a REST API with multiple endpoints. The default routes are:
- /api/login: after successful login using email and password, the response contains a JSON web token for future authentication requests
- /api/profile: to manage the user's own profile
- /api/signup: so a user can signup themselves
- /api/users: for management of users by an administrator
- /api/activate: for activating accounts and resending activation emails


## USE CASE: Verifying emails
1. A user signs up with email
2. The system creates a user account: verified = false
3. The system creates a link to verify his email
4. The system creates an email with the link and sents it to him
5. The user receives the email, opens it, and clicks the link
6. The system looks up the link, and updates the user's account: verified = true