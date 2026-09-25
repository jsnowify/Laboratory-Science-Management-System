"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Info } from "lucide-react";
import { registrationInput } from "@lsms/shared";
import {
  AuthFrame,
  FormField,
  inputClass,
  primaryClass,
} from "@/components/auth/auth-frame";
import { CustomSelect } from "@/components/ui/custom-select";
import { ApiError, apiRequest } from "@/lib/api/client";

type Option = { id: string; name: string; code: string };
type Page = { data: Option[] };
type Values = {
  institutionalId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  personType: "student" | "faculty";
  collegeId: string;
  courseId: string;
};
const initial: Values = {
  institutionalId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  password: "",
  personType: "student",
  collegeId: "",
  courseId: "",
};

export default function RegisterPage() {
  const [values, setValues] = useState(initial);
  const [colleges, setColleges] = useState<Option[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [courseError, setCourseError] = useState("");
  const [courseRetry, setCourseRetry] = useState(0);
  const [fields, setFields] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let active = true;
    apiRequest<Page>("/api/v1/colleges/", { query: { limit: 100 } })
      .then((page) => {
        if (active) {
          setColleges(page.data);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Colleges could not be loaded. Try again or contact your laboratory administrator.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!values.collegeId || values.personType !== "student") return;
    let active = true;
    apiRequest<Page>("/api/v1/courses/", {
      query: { collegeId: values.collegeId, limit: 100 },
    })
      .then((page) => {
        if (active) setCourses(page.data);
      })
      .catch(() => {
        if (active) {
          setCourses([]);
          setCourseError(
            "Courses could not be loaded. Choose your college again to retry.",
          );
        }
      })
      .finally(() => {
        if (active) setCoursesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [values.collegeId, values.personType, courseRetry]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFields({});
    setError("");
    const parsed = registrationInput.safeParse({
      ...values,
      courseId:
        values.personType === "student"
          ? values.courseId || undefined
          : undefined,
    });
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors);
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/api/v1/registration/", {
        method: "POST",
        body: parsed.data,
      });
      setComplete(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setFields(
          cause.fields ??
            (cause.code === "EMAIL_EXISTS"
              ? { email: [cause.message] }
              : cause.code === "INSTITUTIONAL_ID_EXISTS"
                ? { institutionalId: [cause.message] }
                : {}),
        );
      } else setError("Registration could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      wide
      title={complete ? "Request received" : "Create your account"}
      subtitle={
        complete
          ? "Your account is awaiting review."
          : "For students and faculty."
      }
    >
      {complete ? (
        <div className="rounded-2xl border border-[#d8e8d4] bg-[#f5faf3] p-6">
          <CheckCircle2
            size={34}
            className="text-[#28784d]"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-xl font-semibold text-[#193b2a]">
            You’re registered.
          </h2>
          <p className="mt-2 text-sm leading-7 text-[#5e7162]">
            Your account is awaiting administrator activation. You can sign in
            to check its status.
          </p>
          <Link href="/login/" className={`${primaryClass} auth-submit mt-6`}>
            Go to sign in <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-8" aria-busy={busy}>
          <div className="rounded-xl border border-[#dce9d7] bg-[#f4f8f1] p-4 text-sm leading-6 text-[#45684c]">
            <Info
              size={17}
              className="mr-2 inline-block align-[-3px]"
              aria-hidden="true"
            />{" "}
            Registration is reviewed before workspace access is granted.
          </div>
          <section aria-labelledby="identity-heading">
            <div className="mb-5 flex items-center gap-3 border-b border-[#e7ece5] pb-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7f1e5] text-xs font-bold text-[#23603f]">
                01
              </span>
              <h2
                id="identity-heading"
                className="text-base font-semibold text-[#244632]"
              >
                Your details
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="firstName"
                label="First name"
                error={fields.firstName?.[0]}
              >
                <input
                  id="firstName"
                  className={`${inputClass} auth-input`}
                  autoComplete="given-name"
                  required
                  value={values.firstName}
                  onChange={(event) =>
                    setValues({ ...values, firstName: event.target.value })
                  }
                />
              </FormField>
              <FormField
                id="lastName"
                label="Last name"
                error={fields.lastName?.[0]}
              >
                <input
                  id="lastName"
                  className={`${inputClass} auth-input`}
                  autoComplete="family-name"
                  required
                  value={values.lastName}
                  onChange={(event) =>
                    setValues({ ...values, lastName: event.target.value })
                  }
                />
              </FormField>
              <FormField
                id="middleName"
                label="Middle name (optional)"
                error={fields.middleName?.[0]}
              >
                <input
                  id="middleName"
                  className={`${inputClass} auth-input`}
                  autoComplete="additional-name"
                  value={values.middleName}
                  onChange={(event) =>
                    setValues({ ...values, middleName: event.target.value })
                  }
                />
              </FormField>
              <FormField
                id="institutionalId"
                label="Institutional ID"
                error={fields.institutionalId?.[0]}
              >
                <input
                  id="institutionalId"
                  className={`${inputClass} auth-input`}
                  required
                  value={values.institutionalId}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      institutionalId: event.target.value,
                    })
                  }
                />
              </FormField>
            </div>
          </section>
          <section aria-labelledby="affiliation-heading">
            <div className="mb-5 flex items-center gap-3 border-b border-[#e7ece5] pb-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7f1e5] text-xs font-bold text-[#23603f]">
                02
              </span>
              <h2
                id="affiliation-heading"
                className="text-base font-semibold text-[#244632]"
              >
                Campus affiliation
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="personType"
                label="I am a"
                error={fields.personType?.[0]}
              >
                <CustomSelect
                  id="personType"
                  className="auth-input"
                  value={values.personType}
                  options={[
                    { value: "student", label: "Student" },
                    { value: "faculty", label: "Faculty" },
                  ]}
                  placeholder="Choose your role"
                  invalid={Boolean(fields.personType?.length)}
                  describedBy={
                    fields.personType?.length ? "personType-error" : undefined
                  }
                  onValueChange={(value) => {
                    const personType = value as Values["personType"];
                    setCourses([]);
                    setCourseError("");
                    setCoursesLoading(
                      personType === "student" && Boolean(values.collegeId),
                    );
                    setValues({ ...values, personType, courseId: "" });
                  }}
                />
              </FormField>
              <FormField
                id="collegeId"
                label="College"
                error={fields.collegeId?.[0]}
              >
                <CustomSelect
                  id="collegeId"
                  className="auth-input"
                  value={values.collegeId}
                  disabled={loading}
                  required
                  invalid={Boolean(fields.collegeId?.length)}
                  describedBy={
                    fields.collegeId?.length ? "collegeId-error" : undefined
                  }
                  placeholder={
                    loading ? "Loading colleges…" : "Choose a college"
                  }
                  emptyMessage="No colleges are available. Ask the laboratory administrator to add one before registering."
                  options={colleges.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  onValueChange={(value) => {
                    setCourses([]);
                    setCourseError("");
                    setCoursesLoading(
                      values.personType === "student" && Boolean(value),
                    );
                    setValues({ ...values, collegeId: value, courseId: "" });
                  }}
                />
              </FormField>
              {values.personType === "student" && (
                <div className="sm:col-span-2">
                  <FormField
                    id="courseId"
                    label="Course"
                    error={fields.courseId?.[0]}
                  >
                    <CustomSelect
                      id="courseId"
                      className="auth-input"
                      value={values.courseId}
                      disabled={
                        !values.collegeId ||
                        coursesLoading ||
                        Boolean(courseError)
                      }
                      required
                      invalid={Boolean(fields.courseId?.length)}
                      describedBy={
                        fields.courseId?.length ? "courseId-error" : undefined
                      }
                      placeholder={
                        coursesLoading
                          ? "Loading courses…"
                          : !values.collegeId
                            ? "Choose a college first"
                            : "Choose a course"
                      }
                      emptyMessage="No courses are available for this college. Choose another college or ask the laboratory administrator to add one."
                      options={courses.map((item) => ({
                        value: item.id,
                        label: item.name,
                      }))}
                      onValueChange={(value) =>
                        setValues({ ...values, courseId: value })
                      }
                    />
                  </FormField>
                  {values.collegeId &&
                    !coursesLoading &&
                    !courseError &&
                    courses.length === 0 && (
                      <p className="mt-2 text-sm text-amber-900">
                        No courses are available for this college. Choose
                        another college or contact the laboratory administrator.
                      </p>
                    )}
                  {courseError && (
                    <p role="alert" className="mt-2 text-sm text-red-800">
                      {courseError}{" "}
                      <button
                        type="button"
                        className="font-semibold underline"
                        onClick={() => {
                          setCourseError("");
                          setCoursesLoading(true);
                          setCourseRetry((value) => value + 1);
                        }}
                      >
                        Try again
                      </button>
                    </p>
                  )}
                </div>
              )}
              {!loading && colleges.length === 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
                  No colleges are available. Ask the laboratory administrator to
                  add one before registering.
                </p>
              )}
            </div>
          </section>
          <section aria-labelledby="security-heading">
            <div className="mb-5 flex items-center gap-3 border-b border-[#e7ece5] pb-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7f1e5] text-xs font-bold text-[#23603f]">
                03
              </span>
              <h2
                id="security-heading"
                className="text-base font-semibold text-[#244632]"
              >
                Sign-in details
              </h2>
            </div>
            <div className="space-y-5">
              <FormField
                id="email"
                label="Institutional email"
                error={fields.email?.[0]}
              >
                <input
                  id="email"
                  className={`${inputClass} auth-input`}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@institution.edu"
                  required
                  value={values.email}
                  onChange={(event) =>
                    setValues({ ...values, email: event.target.value })
                  }
                />
              </FormField>
              <div>
                <FormField
                  id="password"
                  label="Create password"
                  error={fields.password?.[0]}
                >
                  <div className="relative">
                    <input
                      id="password"
                      className={`${inputClass} auth-input pr-12`}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      aria-invalid={Boolean(fields.password?.length)}
                      aria-describedby={`password-help${fields.password?.length ? " password-error" : ""}`}
                      value={values.password}
                      onChange={(event) =>
                        setValues({ ...values, password: event.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-1 flex w-10 items-center justify-center text-[#627367] hover:text-[#174d38]"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff size={19} aria-hidden="true" />
                      ) : (
                        <Eye size={19} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </FormField>
                <p
                  id="password-help"
                  className="mt-2 text-xs leading-5 text-[#657568]"
                >
                  Use 12 or more characters, including uppercase and lowercase
                  letters, a number, and a special character.
                </p>
              </div>
            </div>
          </section>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={
              busy || loading || colleges.length === 0 || coursesLoading
            }
            className={`${primaryClass} auth-submit w-full`}
          >
            {busy ? (
              "Submitting…"
            ) : (
              <>
                Submit registration <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      )}
      <p className="mt-7 text-center text-sm text-[#647367]">
        Already have an account?{" "}
        <Link
          href="/login/"
          className="font-semibold text-[#17633e] underline decoration-transparent underline-offset-4 hover:decoration-current"
        >
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
