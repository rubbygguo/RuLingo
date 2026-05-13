import { useEffect, useState } from "react";
import { Paper } from "@mantine/core";
import {
  getCurrentProgressUser,
  sendProgressEmailLoginCode,
  signInProgressUser,
  signInProgressUserWithEmailCode
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
  const [loginMethod, setLoginMethod] = useState("email-code");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailVerificationInfo, setEmailVerificationInfo] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

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
    setNotice("");
    setIsSubmitting(true);

    try {
      if (loginMethod === "email-code") {
        await signInProgressUserWithEmailCode(email.trim(), emailCode.trim(), emailVerificationInfo);
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

  async function sendEmailCode() {
    setError("");
    setNotice("");
    setIsSendingCode(true);

    try {
      const verificationInfo = await sendProgressEmailLoginCode(email);
      setEmailVerificationInfo(verificationInfo);
      setNotice("邮箱验证码已发送，请查看邮箱。");
    } catch (sendError) {
      setError(sendError.message || "验证码发送失败");
    } finally {
      setIsSendingCode(false);
    }
  }

  function switchLoginMethod(nextMethod) {
    setLoginMethod(nextMethod);
    setError("");
    setNotice("");
  }

  return (
    <main className="login-page">
      <Paper component="section" className="panel login-card" withBorder shadow="sm" radius="md" p="lg">
        <div>
          <p className="eyebrow">RuLingo</p>
          <h1>登录账号</h1>
        </div>
        <form className="login-form vertical" onSubmit={submit}>
          <div className="mode-switch auth-methods">
            <button
              type="button"
              className={loginMethod === "email-code" ? "active" : ""}
              onClick={() => switchLoginMethod("email-code")}
            >
              邮箱验证码
            </button>
            <button
              type="button"
              className={loginMethod === "password" ? "active" : ""}
              onClick={() => switchLoginMethod("password")}
            >
              账号密码
            </button>
          </div>
          {loginMethod === "password" ? (
            <>
              <label className="date-field">
                <span>用户名</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                />
              </label>
              <label className="date-field">
                <span>密码</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
            </>
          ) : (
            <>
              <label className="date-field">
                <span>邮箱</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailVerificationInfo(null);
                  }}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@example.com"
                />
              </label>
              <label className="date-field">
                <span>验证码</span>
                <input
                  type="text"
                  value={emailCode}
                  onChange={(event) => setEmailCode(event.target.value)}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </label>
            </>
          )}
          <div className="login-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "处理中..." : "登录"}
            </button>
            {loginMethod === "email-code" && (
              <button type="button" onClick={sendEmailCode} disabled={isSendingCode}>
                {isSendingCode ? "发送中..." : "发送验证码"}
              </button>
            )}
          </div>
          {notice && <p className="form-notice">{notice}</p>}
          {error && <p className="form-error">{error}</p>}
        </form>
      </Paper>
    </main>
  );
}

export function getBasePath() {
  return "/";
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
