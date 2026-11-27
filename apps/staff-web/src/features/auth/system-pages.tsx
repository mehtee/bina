import { Link } from "react-router";
import { StateSurface } from "~/design-system/primitives/state-surfaces";

export function NotFoundPage() {
  return (
    <StateSurface
      kind="error"
      title="صفحه یا رکورد درخواستی یافت نشد (۴۰۴)"
      description="نشانی درخواستی در این کلینیک موجود نیست یا مجوز دسترسی به آن وجود ندارد."
      action={
        <Link to="/overview" className="bina-button" data-variant="primary">
          بازگشت به داشبورد
        </Link>
      }
    />
  );
}

export function ForbiddenPage() {
  return (
    <StateSurface
      kind="permission"
      title="عدم دسترسی به بخش درخواستی (۴۰۳)"
      description="دسترسی به این صفحه بر اساس سیاست RBAC کلینیک مسدود است."
      action={
        <Link to="/overview" className="bina-button" data-variant="primary">
          بازگشت به داشبورد
        </Link>
      }
    />
  );
}
