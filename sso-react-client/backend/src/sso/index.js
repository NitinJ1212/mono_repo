import axios from "axios";

async function loginWithSSO(url) {
    try {
        const response = await axios.get(url, { withCredentials: true });
        return response.data.session_id || null;
    } catch (error) {
        console.log(error)
        return error.response?.data?.message || error.message || { error: "SSO login failed" };
    }
}

export default loginWithSSO;