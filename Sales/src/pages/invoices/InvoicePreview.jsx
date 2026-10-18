import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";
import PageHeader from "../../components/common/PageHeader";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function InvoicePreview() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const token = localStorage.getItem("hrms_sales_token");
  const navigate = useNavigate();
  const pdfRef = useRef();

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/sales/invoices/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setInvoice(res.data.invoice);
      } catch (err) {
        console.error("Invoice fetch error:", err);
      }
    };

    fetchInvoice();
  }, [id]);

  const handleDownload = () => {
    const element = pdfRef.current;

    const opt = {
      margin: 5, // reduce margin
      filename: `invoice-${invoice.id}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 1.5, // 🔥 reduce scale (was 2)
        useCORS: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .catch((err) => {
        console.error("Invoice PDF download error:", err);
        toast.error("Failed to download PDF: " + (err?.message || "unknown error"));
      });
  };

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice" desc="Preview and download the tax invoice" />
        <div className="sp-card p-10 text-center text-sm font-medium text-slate-500">Loading invoice...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoice_no ? `Invoice ${invoice.invoice_no}` : "Invoice"}
        desc={invoice.client_name ? `Tax invoice for ${invoice.client_name}` : "Preview and download the tax invoice"}
        actions={
          <>
            <button type="button" onClick={() => navigate("/invoices")} className="btn-on-brand-ghost">
              Back
            </button>
            <button type="button" onClick={handleDownload} className="btn-on-brand">
              Download PDF
            </button>
          </>
        }
      />

      {/* PDF CONTENT - .proposal-paper keeps it paper-white in dark mode, matching the PDF */}
      <div
        ref={pdfRef}
        className="proposal-paper mx-auto w-full max-w-[800px] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-card"
      >
        {" "}
        <h1 className="text-center text-xl font-semibold mb-6">Tax Invoice</h1>
        {/* COMPANY */}
        <div className="border p-4 text-sm">
          <p className="font-semibold">RECRUWEB RESOURCES PRIVATE LIMITED</p>
          <p>GSTIN: 09AANCR1081L1ZW</p>
        </div>
        {/* CLIENT */}
        <div className="border p-4 text-sm mt-2">
          <p className="font-semibold">Buyer: {invoice.client_name}</p>
          <p>{invoice.client_address}</p>
          <p>GSTIN: {invoice.client_gstin}</p>
        </div>
        {/* TABLE */}
        <table className="w-full border mt-4 text-sm">
          <thead>
            <tr>
              <th className="border p-2">Description</th>
              <th className="border p-2">HSN</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Rate</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>

          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td className="border p-2">{item.description}</td>
                <td className="border p-2">{item.hsn_sac}</td>
                <td className="border p-2">{item.quantity}</td>
                <td className="border p-2">
                  ₹{Number(item.rate).toLocaleString("en-IN")}
                </td>
                <td className="border p-2">
                  ₹{Number(item.amount).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* TOTAL */}
        <div className="flex justify-end mt-4 text-sm">
          <div>
            <p>
              Taxable: ₹{Number(invoice.taxable_amount).toLocaleString("en-IN")}
            </p>
            <p>CGST: ₹{Number(invoice.cgst).toLocaleString("en-IN")}</p>
            <p>SGST: ₹{Number(invoice.sgst).toLocaleString("en-IN")}</p>
            <p className="font-semibold">
              Total: ₹{Number(invoice.total_amount).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        {/* FOOTER */}
        <div className="mt-6 flex justify-between text-sm">
          <div>
            <p className="font-semibold">Declaration</p>
            <p>This is a computer generated invoice.</p>
          </div>

          <div className="text-right">
            <p>Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
