export const API_ADMINS = "/api/v1/users/admin";
export const API_MENTORS = "/api/v1/mentor";
export const API_COURSES = "/api/v1/course";
export const API_STUDENTS = "/api/v1/students";
export const API_ASSISTANTS = "/api/v1/assistend";
export const API_CATEGORIES = "/api/v1/category";
export const API_SECTIONS = "/api/v1/section";
export const API_LESSONS = "/api/v1/lesson";
export const API_HOMEWORKS = "/api/v1/homework";

/* NestJS xato javoblari: message string yoki string[] bo'lishi mumkin */
export type ApiError = {
  name?: string;
  message?: string | string[];
  status?: number;
  statusCode?: number;
  response?: { message?: string | string[]; statusCode?: number };
};

/* Backend auth xatolarini 400 bilan qaytaradi, haqiqiy kod esa body ichida */
export function isAuthError(res: { status: number }, body: ApiError | null) {
  // eskirgan/buzilgan token: backend 400 + {name: "JsonWebTokenError"} qaytaradi
  if (body?.name === "JsonWebTokenError" || body?.name === "TokenExpiredError")
    return true;

  const code =
    body?.response?.statusCode ?? body?.statusCode ?? body?.status ?? res.status;
  return code === 401 || code === 403;
}

export function errorMessage(body: ApiError | null, fallback: string) {
  const m = body?.response?.message ?? body?.message;
  if (Array.isArray(m)) return m.join(", ");
  return m || fallback;
}

export async function readBody<T>(res: Response): Promise<T | null> {
  return (await res.json().catch(() => null)) as T | null;
}

/* fetch yuklash foizini bermaydi — katta video uchun XHR ishlatamiz */
export type FormResult = {
  ok: boolean;
  status: number;
  body: ApiError | null;
};

export function sendForm(
  url: string,
  method: "POST" | "PATCH",
  form: FormData,
  token: string,
  onProgress?: (percent: number) => void,
): Promise<FormResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let body: ApiError | null = null;
      try {
        body = JSON.parse(xhr.responseText) as ApiError;
      } catch {
        body = null;
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        body,
      });
    };

    xhr.onerror = () => reject(new Error("Server bilan ulanishda xato yuz berdi"));
    // sahifa yangilansa yoki so'rov uzilsa promise osilib qolmasin
    xhr.onabort = () => reject(new Error("Yuklash uzilib qoldi — qaytadan urinib ko'ring"));
    xhr.send(form);
  });
}

/* 4404019 -> "4.2 MB" */
export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
