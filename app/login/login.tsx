export function LoginPage() {

    // Hit express API to login user with Auth0
    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const username = formData.get('username');
        const password = formData.get('password');
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        if (response.ok) {
            const data = await response.json();
            console.log('Login successful:', data);
            // Redirect to dashboard or home page
        }
        else {
            const error = await response.json();
            console.error('Login failed:', error);
            // Show error message to user
        }
    };

    return (
        <div>
        <h1>Login</h1>
        <form>
            <label>
            Username:
            <input type="text" name="username" />
            </label>
            <br />
            <label>
            Password:
            <input type="password" name="password" />
            </label>
            <br />
            <button type="submit" onClick={handleLogin}>Login</button>
            <button type="button" onClick={() => window.location.href = '/api/auth/login'}>Login with Auth0</button>
        </form>
        </div>
    );
}