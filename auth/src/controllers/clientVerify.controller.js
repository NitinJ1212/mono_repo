const { getPool } = require('../config/postgresdb');
const { generateAccessTokenSSO } = require('../utils/token.utils');


exports.capture = async (req, res, next) => {
  try {
    const params = req.query;
    const { response_type, client_id, scope, redirect_uri, state, secret_key } = params
    if (!client_id || !redirect_uri) {
      return res.status(400).json({
        message: "Missing required query parameters: client_id and redirect_uri",
      });
    }
    const dt = await getPool().query(`select * from auth_service_users where client_id='${client_id}' and redirect_uri='${redirect_uri}' `)
    const token = generateAccessTokenSSO({ client_id, state, redirect_uri });
    const tokenGenerateTime = new Date().toISOString();
    if (dt.rows.length > 0) {
      await getPool().query(`update public.auth_service_users SET  state='${state}', token='${token}', token_generate_time='${tokenGenerateTime}',   updated_at=NOW()`)
      const response = {
        message: "Query parameters received successfully",
        params,
        data: dt.rows, // empty array if no results
      };
      return res.status(200).json(response);
    } else {
      const response = {
        message: "Unauthrize User"
      };
      return res.status(200).json(response);
    }
  } catch (err) {
    console.log("errror-------------", err)
    next(err);
  }
};
