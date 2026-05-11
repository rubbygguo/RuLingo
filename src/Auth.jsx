import { useEffect, useState } from "react";
import { Paper } from "@mantine/core";
import {
  getCurrentProgressUser,
  signInProgressUser,
  signUpProgressUser
} from "./progressStore.js";

export function RequireAuth({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let ignore = false;

    getCurrentProgressUser()
      .then((user) => {
        if (ignore) return;
        if (user) {
          setStatus("signed-in");
          return;
        }
        redirectToLogin();
      })
      .catch((error) => {
        console.error(error);
        if (!ignore) redirectToLogin();
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (status !== "signed-in") {
    return <div className="auth-loading">正在检查登录状态...</div>;
  }

  return children;
}

export function LoginPage() {
  const [mode, setMode] = useState("sign-in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    getCurrentProgressUser()
      .then((user) => {
        if (!ignore && user) redirectAfterLogin();
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "sign-up") {
        await signUpProgressUser(username.trim(), password);
      } else {
        await signInProgressUser(username.trim(), password);
      }
      redirectAfterLogin();
    } catch (submitError) {
      setError(submitError.message || "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <Paper component="section" className="panel login-card" withBorder shadow="sm" radius="md" p="lg">
        <div>
          <p className="eyebrow">RuLingo</p>
          <h1>{mode === "sign-up" ? "创建账号" : "登录账号"}</h1>
        </div>
        <form className="login-form vertical" onSubmit={submit}>
          <label className="date-field">
            <span>用户名</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label className="date-field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            />
          </label>
          <div className="login-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "处理中..." : mode === "sign-up" ? "注册并登录" : "登录"}
            </button>
            <button type="button" onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}>
              {mode === "sign-up" ? "已有账号" : "创建账号"}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      </Paper>
    </main>
  );
}

export function getBasePath() {
  return "/site/";
}

function redirectToLogin() {
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const redirect = encodeURIComponent(currentPath.replace(getBasePath(), "/"));
  window.location.replace(`${getBasePath()}login?redirect=${redirect}`);
}

function redirectAfterLogin() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect") || "/today";
  const normalizedRedirect = redirect.startsWith("/") ? redirect.slice(1) : redirect;
  window.location.replace(`${getBasePath()}${normalizedRedirect}`);
}
