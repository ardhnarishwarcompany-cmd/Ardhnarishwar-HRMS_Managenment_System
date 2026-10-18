import PageHeader from "../components/common/PageHeader";

export default function MainLayout({ children, title, desc }) {
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* HEADER */}
      <div className="px-6 pt-6">
        <PageHeader title={title} desc={desc} />
      </div>

      {/* BODY */}
      <div className="px-6 pb-6">
        {children}
      </div>

    </div>
  );
}