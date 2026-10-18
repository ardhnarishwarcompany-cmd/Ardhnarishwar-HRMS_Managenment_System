import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function CreateInvoice() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    client_name: "",
    client_address: "",
    client_gstin: "",
    invoice_date: "",
    description: "",
    hsn: "",
    quantity: 1,
    rate: 0,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const amount = form.quantity * form.rate;
      const cgst = amount * 0.09;
      const sgst = amount * 0.09;

      const payload = {
        invoice_no: "INV-" + Date.now(),
        client_name: form.client_name,
        client_address: form.client_address,
        client_gstin: form.client_gstin,
        invoice_date: form.invoice_date,
        taxable_amount: amount,
        cgst,
        sgst,
        total_amount: amount + cgst + sgst,
        items: [
          {
            description: form.description,
            hsn_sac: form.hsn,
            gst_rate: 18,
            quantity: form.quantity,
            rate: form.rate,
            amount,
          },
        ],
      };

      const token = localStorage.getItem("hrms_client_Token");

      const res = await axios.post(`${BASE_URL}/client/invoices`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      navigate(`/invoice/${res.data.invoice.invoiceId}`);
    } catch (err) {
      console.error("Create invoice error:", err);
    }
  };

  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5";

  return (
    <div className="animate-fadeUp max-w-3xl">
      <PageHeader
        icon={FileText}
        title="Create Invoice"
        subtitle="Fill in client and service details to generate a GST invoice."
      />

      <div className="card-premium p-5 sm:p-6 space-y-6">
        <section>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Client details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <label className="block md:col-span-2">
              <span className={labelCls}>Client Name</span>
              <input
                name="client_name"
                placeholder="Client Name"
                className="input-premium"
                onChange={handleChange}
              />
            </label>

            <label className="block md:col-span-2">
              <span className={labelCls}>Client Address</span>
              <input
                name="client_address"
                placeholder="Client Address"
                className="input-premium"
                onChange={handleChange}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Client GSTIN</span>
              <input
                name="client_gstin"
                placeholder="Client GSTIN"
                className="input-premium"
                onChange={handleChange}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Invoice Date</span>
              <input
                name="invoice_date"
                type="date"
                className="input-premium"
                onChange={handleChange}
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Service line</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <label className="block md:col-span-3">
              <span className={labelCls}>Service Description</span>
              <input
                name="description"
                placeholder="Service Description"
                className="input-premium"
                onChange={handleChange}
              />
            </label>

            <label className="block">
              <span className={labelCls}>HSN/SAC</span>
              <input
                name="hsn"
                placeholder="HSN/SAC"
                className="input-premium"
                onChange={handleChange}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Quantity</span>
              <input
                name="quantity"
                type="number"
                placeholder="Quantity"
                className="input-premium"
                onChange={handleChange}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Rate</span>
              <input
                name="rate"
                type="number"
                placeholder="Rate"
                className="input-premium"
                onChange={handleChange}
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button onClick={handleSubmit} className="btn-primary">
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
