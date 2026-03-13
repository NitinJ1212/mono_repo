import { useState } from "react";
import { loginUser } from "../api/auth";
import { getQueryParams } from "../utils/query";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const oauth = getQueryParams();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await loginUser({ email, password, ...oauth });
            console.log(res.data.message, "res.data---")
            if (res.data.message) {
                alert(res.data.message);
                setLoading(false);
                return;
            }
            const { redirect_uri } = res.data;
            if (redirect_uri) {
                window.location.href = redirect_uri;
            }
        } catch (err) {
            alert("Login failed");
            console.log(err)
        }
        setLoading(false);
    };

    return (
        <div style={{ width: 400, margin: "100px auto" }}>
            <h2>SSO Login</h2>

            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <br /><br />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <br /><br />

                <button disabled={loading}>
                    {loading ? "Signing in..." : "Login"}
                </button>
            </form>
        </div>
    );
}