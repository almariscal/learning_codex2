import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Role = "admin" | "employee";

const LoginPage = (): JSX.Element => {
  const [role, setRole] = useState<Role>("admin");
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(role === "admin" ? "/admin" : "/employee");
  };

  return (
    <section className="mx-auto mt-16 max-w-md rounded-lg bg-white p-8 shadow">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Acceso Parking</h1>
      <p className="mb-6 text-sm text-slate-500">
        Autenticación real se integrará con AWS Cognito. De momento selecciona el rol para simular la experiencia.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Rol</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="admin"
                checked={role === "admin"}
                onChange={() => setRole("admin")}
              />
              RRHH
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="employee"
                checked={role === "employee"}
                onChange={() => setRole("employee")}
              />
              Empleado
            </label>
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-500"
        >
          Entrar
        </button>
      </form>
    </section>
  );
};

export default LoginPage;
