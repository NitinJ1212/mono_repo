import axios from "axios";

async function logoutAllclient(url) {
    try {
        console.log(url, "-----------url-----------")
        const response = await axios.get(url, { withCredentials: true });
        return response.data || null;
    } catch (error) {
        console.log(error.response)
        return error.response?.data || error.message || { error: "SSO login failed" };
    }
}

export default loginWithSSO;