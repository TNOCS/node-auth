[![Build Status](https://travis-ci.org/TNOCS/node-auth.svg?branch=master)](https://travis-ci.org/TNOCS/node-auth)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/83c457cab2904027a1365e06c48991dd)](https://www.codacy.com/app/erikvullings/node-auth?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=TNOCS/node-auth&amp;utm_campaign=Badge_Grade)
[![codecov](https://codecov.io/gh/TNOCS/node-auth/branch/master/graph/badge.svg)](https://codecov.io/gh/TNOCS/node-auth)
<a href="https://codeclimate.com/github/TNOCS/node-auth"><img src="https://codeclimate.com/github/TNOCS/node-auth/badges/issue_count.svg" /></a>

# node-auth
Node-auth is an express middleware for authentication and authorization.

## Authentication (AuthN)

It creates a REST API with multiple endpoints. The default routes, which can be configured, are:
- /api/login: after successful login using email and password, the response contains a JSON web token for future authentication requests, and the user object
- /api/profile: to manage the user's own profile
- /api/signup: so a user can signup themselves
- /api/users: for management of users by an administrator
- /api/activate: for activating accounts and resending activation emails

Besides creating these endpoints, it also creates an express middleware that intercepts all requests, and (default, can be overruled) blocks all unauthenticated users.

## Authorization (AuthZ)
It is also very simple to create an [XACML (eXtensible Access Control Markup Language)](https://www.oasis-open.org/committees/xacml)-like authorization system. It only resembles XACML in that you can use policy sets, with multiple policies, and each policy can have multiple rules that govern access to your resources. Each rule is typically formulated by specifying the SUBJECT that can take an ACTION on a RESOURCE.

The policy store allows you to create policy enforcers or guards to protect your resources. There is also one additional route for editing the policies.
- /api/authorizations: for editing the rights policies

## USE CASE: Verifying emails
1. A user signs up with email
2. The system creates a user account: verified = false
3. The system creates a link to verify his email
4. The system creates an email with the link and sents it to him
5. The user receives the email, opens it, and clicks the link
6. The system looks up the link, and updates the user's account: verified = true
