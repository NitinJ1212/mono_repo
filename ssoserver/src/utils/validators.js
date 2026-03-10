// src/utils/validators.js
const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  session_id: z.string().optional(),
});

const mfaVerifySchema = z.object({
  mfa_token: z.string().length(6, 'MFA token must be 6 digits'),
  session_id: z.string().min(1),
});

const authorizeSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  response_type: z.literal('code'),
  scope: z.string().min(1),
  state: z.string().min(8),
  // code_challenge:        z.string().min(43).max(128),
  // code_challenge_method: z.literal('S256'),
});

const tokenSchema = z.discriminatedUnion('grant_type', [
  z.object({
    grant_type: z.literal('authorization_code'),
    code: z.string().min(1),
    redirect_uri: z.string().url(),
    client_id: z.string().min(1),
    client_secret: z.string().min(1),
    code_verifier: z.string().min(43).max(128),
  }),
  z.object({
    grant_type: z.literal('refresh_token'),
    refresh_token: z.string().min(1),
    client_id: z.string().min(1),
    client_secret: z.string().min(1),
  }),
]);

const revokeSchema = z.object({
  token: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

const clientRegisterSchema = z.object({
  name: z.string().min(1).max(255),
  redirect_uris: z.array(z.string().url()).min(1),
  allowed_scopes: z.array(z.string()).optional(),
  grant_types: z.array(z.string()).optional(),
});

// Middleware factory
function validate(schema) {
  console.log("33333333333333333-------------")
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'validation_error',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.validated = result.data;
    next();
  };
}

// function validateQuery(schema) {
//   return (req, res, next) => {
//     const result = schema.safeParse(req.query);
//     if (!result.success) {
//       return res.status(400).json({
//         error: 'invalid_request',
//         details: result.error.flatten().fieldErrors,
//       });
//     }
//     console.log(schema.safeParse(req.query), "-----------------==", req.query);
//     req.validated = result.data;
//     next();
//   };
// }

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.passthrough().safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        error: "invalid_request",
        details: result.error.flatten().fieldErrors,
      });
    }
    // console.log(result, "-----------------==", req.query);
    req.validated = result.data;
    next();
  };
}

module.exports = {
  registerSchema, loginSchema, mfaVerifySchema,
  authorizeSchema, tokenSchema, revokeSchema,
  clientRegisterSchema,
  validate, validateQuery,
};
