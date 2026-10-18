import EmployeeNavbar from "./EmployeeNavbar";
import PageHeadingBar from "./PageHeadingBar";

/**
 * Shared Employee Portal shell.
 * The sidebar + top bar are mounted once here so every protected page
 * has the exact same navigation chrome, matching the reference UI.
 */
export default function EmployeeLayout({ children }) {
  return (
    <div className="employee-app-shell">
      <EmployeeNavbar>
        <PageHeadingBar />
        <section className="employee-page-container">
          {children}
        </section>
      </EmployeeNavbar>
    </div>
  );
}
