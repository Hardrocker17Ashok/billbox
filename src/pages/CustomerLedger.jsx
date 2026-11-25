import "./CustomerLedger.css";
import "./BillHistory.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import PageLoader from "../components/PageLoader";

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const number = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

const dateOf = (value) => {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateText = (value, hi = false) => {
  const date = dateOf(value);
  return date
    ? date.toLocaleDateString(hi ? "hi-IN" : "en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
};

const timeText = (value, hi = false) => {
  const date = dateOf(value);
  return date
    ? date.toLocaleTimeString(hi ? "hi-IN" : "en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
};

const totalOf = (bill) =>
  Number(bill.grandTotal ?? bill.totalAmount ?? bill.payment?.total ?? 0) || 0;

const paidOf = (bill) =>
  Number(bill.paidAmount ?? bill.amountPaid ?? bill.payment?.paid ?? 0) || 0;

const balanceOf = (bill) =>
  Math.max(
    0,
    Number(
      bill.balanceDue ??
        bill.balanceAmount ??
        bill.payment?.balance ??
        totalOf(bill) - paidOf(bill)
    ) || 0
  );

const statusOf = (bill) => {
  const balance = balanceOf(bill);
  if (balance <= 0.009) return "paid";
  if (paidOf(bill) > 0) return "partial";
  return "due";
};

const getBillItems = (bill) => {
  if (Array.isArray(bill?.items) && bill.items.length) return bill.items;
  if (!bill) return [];
  return [
    {
      itemName: bill.itemName || "-",
      metal: bill.metal || "",
      carat: bill.carat || "",
      quantity: bill.quantity || 1,
      weight: bill.weight || 0,
      rate: bill.rate || 0,
      amount: bill.amount ?? bill.itemAmount ?? 0,
    },
  ];
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

function openPrintDocument(title, body, language = "en") {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert(
      language === "hi"
        ? "PDF बनाने के लिए पॉप-अप की अनुमति दें।"
        : "Please allow pop-ups to create the PDF."
    );
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="${language === "hi" ? "hi" : "en"}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,"Noto Sans Devanagari",sans-serif;color:#222;margin:0;padding:28px;font-size:12px}
  .print-wrap{max-width:1000px;margin:0 auto}
  .print-head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #b18a48;padding-bottom:16px;margin-bottom:18px}
  h1{font-size:22px;margin:0 0 6px}
  h2{font-size:15px;margin:22px 0 10px}
  p{margin:4px 0;line-height:1.45}
  .muted{color:#666}
  .right{text-align:right}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}
  .stat{border:1px solid #ddd;padding:11px;border-radius:5px}
  .stat span{display:block;color:#666;font-size:10px;margin-bottom:6px}
  .stat strong{font-size:16px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}
  th{background:#f2eee6;font-size:10px}
  .totals{width:min(360px,100%);margin:16px 0 0 auto}
  .totals td{border:0;border-bottom:1px solid #eee;padding:7px}
  .grand{font-weight:bold;font-size:15px}
  .shop-logo{max-width:65px;max-height:65px;object-fit:contain}
  .footer{margin-top:28px;padding-top:10px;border-top:1px solid #ddd;color:#777;font-size:10px;text-align:center}
  @page{size:auto;margin:12mm}
  @media print{body{padding:0}.no-print{display:none!important}tr{break-inside:avoid}}
</style>
</head>
<body><div class="print-wrap">${body}</div>
<script>
window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},350);});
</script>
</body></html>`);
  printWindow.document.close();
}

function buildBillPrintHtml(bill, profile, hi) {
  const items = getBillItems(bill);
  const base = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const making = Number(
    bill.makingCharges ??
      items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.makingCharges ??
              item.chargesBreakdown?.makingTotal ??
              0
          ),
        0
      )
  );
  const other = Number(
    bill.otherCharges ??
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.otherCharges ?? item.chargesBreakdown?.otherTotal ?? 0),
        0
      )
  );
  const discount = Number(bill.offer ?? bill.discount ?? 0);
  const subtotal = Number(bill.subtotal ?? base + making + other - discount);
  const gst = Number(bill.gstAmount || 0);
  const total = totalOf(bill);
  const paid = paidOf(bill);
  const due = balanceOf(bill);
  const shopName = bill.shopName || profile.shopName || "BillBox";
  const t = hi
    ? {
        invoice: "बिल / बिक्री रसीद", billNo: "बिल नंबर", date: "तारीख",
        customer: "ग्राहक", phone: "मोबाइल", items: "खरीदे गए आभूषण",
        item: "आभूषण", metal: "धातु", qty: "मात्रा", weight: "वजन",
        rate: "दर", amount: "राशि", making: "मेकिंग चार्ज", other: "अन्य शुल्क",
        discount: "छूट", subtotal: "उप-योग", gst: "GST", total: "कुल राशि",
        paid: "प्राप्त राशि", due: "बाकी राशि", status: "भुगतान स्थिति",
        paidStatus: "भुगतान पूरा", partial: "आंशिक भुगतान", dueStatus: "भुगतान बाकी",
        owner: "मालिक", address: "पता", thanks: "आपके विश्वास के लिए धन्यवाद",
      }
    : {
        invoice: "INVOICE / SALES RECEIPT", billNo: "Bill number", date: "Date",
        customer: "Customer", phone: "Mobile", items: "PURCHASED ITEMS",
        item: "Item", metal: "Metal", qty: "Qty", weight: "Weight",
        rate: "Rate", amount: "Amount", making: "Making charges", other: "Other charges",
        discount: "Discount", subtotal: "Subtotal", gst: "GST", total: "Grand total",
        paid: "Amount received", due: "Balance due", status: "Payment status",
        paidStatus: "Paid", partial: "Partially paid", dueStatus: "Payment due",
        owner: "Owner", address: "Address", thanks: "Thank you for your trust",
      };

  const status = statusOf(bill);
  const rows = items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.itemName || (hi ? "आभूषण" : "Jewellery"))}</td>
        <td>${escapeHtml(item.metal || "-")}${item.carat ? ` / ${escapeHtml(item.carat)}` : ""}</td>
        <td>${number(item.quantity || 1)}</td>
        <td>${number(item.weight)} g</td>
        <td>₹${money(item.rate)}</td>
        <td>₹${money(item.lineTotal ?? item.totalAmount ?? item.amount)}</td>
      </tr>`
    )
    .join("");

  return `
    <div class="print-head">
      <div>
        ${profile.logoUrl || bill.shopLogoUrl ? `<img class="shop-logo" src="${escapeHtml(bill.shopLogoUrl || profile.logoUrl)}" />` : ""}
        <h1>${escapeHtml(shopName)}</h1>
        <p>${escapeHtml(bill.shopOwnerName || profile.ownerName || "")}</p>
        <p>${escapeHtml(bill.shopAddress || profile.address || "")}</p>
        <p>${escapeHtml(bill.shopPhone || profile.phone || "")}</p>
        <p>${escapeHtml(bill.shopGstNumber || profile.gstNumber || "")}</p>
      </div>
      <div class="right">
        <h1>${t.invoice}</h1>
        <p><b>${t.billNo}:</b> #${escapeHtml(bill.billNumber || bill.invoiceNo || bill.id)}</p>
        <p><b>${t.date}:</b> ${dateText(bill.createdAt, hi)} ${timeText(bill.createdAt, hi)}</p>
      </div>
    </div>
    <p><b>${t.customer}:</b> ${escapeHtml(bill.customerName || (hi ? "ग्राहक" : "Customer"))}</p>
    <p><b>${t.phone}:</b> ${escapeHtml(bill.customerMobile || "-")}</p>
    <h2>${t.items}</h2>
    <table><thead><tr><th>${t.item}</th><th>${t.metal}</th><th>${t.qty}</th><th>${t.weight}</th><th>${t.rate}</th><th>${t.amount}</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="totals">
      <tr><td>${t.subtotal}</td><td class="right">₹${money(subtotal)}</td></tr>
      ${making ? `<tr><td>${t.making}</td><td class="right">₹${money(making)}</td></tr>` : ""}
      ${other ? `<tr><td>${t.other}</td><td class="right">₹${money(other)}</td></tr>` : ""}
      ${discount ? `<tr><td>${t.discount}</td><td class="right">- ₹${money(discount)}</td></tr>` : ""}
      ${gst ? `<tr><td>${t.gst}</td><td class="right">₹${money(gst)}</td></tr>` : ""}
      <tr class="grand"><td>${t.total}</td><td class="right">₹${money(total)}</td></tr>
      <tr><td>${t.paid}</td><td class="right">₹${money(paid)}</td></tr>
      <tr><td>${t.due}</td><td class="right">₹${money(due)}</td></tr>
      <tr><td>${t.status}</td><td class="right">${status === "paid" ? t.paidStatus : status === "partial" ? t.partial : t.dueStatus}</td></tr>
    </table>
    <div class="footer">${t.thanks}</div>`;
}

function CustomerLedger() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const language = localStorage.getItem("billbox-language") === "hi" ? "hi" : "en";
  const theme = localStorage.getItem("billbox-theme") === "light" ? "light" : "dark";
  const hi = language === "hi";

  const [bills, setBills] = useState([]);
  const [profile, setProfile] = useState({
    shopName: "BillBox", ownerName: "", phone: "", address: "",
    gstNumber: "", logoUrl: "", theme: "dark", language: "hi",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [paymentBill, setPaymentBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [notice, setNotice] = useState("");

  const loadBills = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      setError(hi ? "कृपया लॉगिन करें।" : "Please log in.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const billsQuery = query(
        collection(db, "bills"),
        where("ownerId", "==", user.uid)
      );
      const [billSnapshot, profileSnapshot] = await Promise.all([
        getDocs(billsQuery),
        getDoc(doc(db, "shops", user.uid)),
      ]);
      setBills(
        billSnapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort(
            (a, b) =>
              (dateOf(b.createdAt)?.getTime() || 0) -
              (dateOf(a.createdAt)?.getTime() || 0)
          )
      );
      if (profileSnapshot.exists()) {
        setProfile((current) => ({ ...current, ...profileSnapshot.data() }));
      }
    } catch (err) {
      console.error("Customer ledger load error:", err);
      setError(
        hi
          ? "लेन-देन लोड नहीं हो सके। Firestore permissions जाँचें।"
          : "Could not load customer transactions. Check Firestore permissions."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.uid, hi]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedBill(null);
        if (!savingPayment) setPaymentBill(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [savingPayment]);

  const filteredBills = useMemo(() => {
    const now = new Date();
    let start = null;
    if (period === "1m") start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    if (period === "2m") start = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
    if (period === "3m") start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const term = search.trim().toLowerCase();

    return bills.filter((bill) => {
      const date = dateOf(bill.createdAt);
      if (start && (!date || date < start)) return false;
      if (period === "custom") {
        if (!date) return false;
        const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        if (fromDate && day < fromDate) return false;
        if (toDate && day > toDate) return false;
      }
      if (status !== "all" && statusOf(bill) !== status) return false;
      if (selectedCustomer && (bill.customerMobile || bill.customerName || "unknown") !== selectedCustomer) return false;
      const haystack = `${bill.customerName || ""} ${bill.customerMobile || ""} ${bill.billNumber || bill.invoiceNo || ""} ${getBillItems(bill).map((item) => item.itemName || "").join(" ")}`.toLowerCase();
      return !term || haystack.includes(term);
    });
  }, [bills, period, fromDate, toDate, status, search, selectedCustomer]);

  const totals = useMemo(
    () =>
      filteredBills.reduce(
        (acc, bill) => {
          acc.total += totalOf(bill);
          acc.paid += paidOf(bill);
          acc.balance += balanceOf(bill);
          if (statusOf(bill) === "paid") acc.paidBills += 1;
          else acc.dueBills += 1;
          return acc;
        },
        { total: 0, paid: 0, balance: 0, paidBills: 0, dueBills: 0 }
      ),
    [filteredBills]
  );

  const customers = useMemo(() => {
    const map = new Map();
    filteredBills.forEach((bill) => {
      const key = bill.customerMobile || bill.customerName || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: bill.customerName || (hi ? "ग्राहक" : "Customer"),
          mobile: bill.customerMobile || "",
          total: 0,
          paid: 0,
          balance: 0,
        });
      }
      const item = map.get(key);
      item.total += totalOf(bill);
      item.paid += paidOf(bill);
      item.balance += balanceOf(bill);
    });
    return [...map.values()].sort((a, b) => b.balance - a.balance);
  }, [filteredBills, hi]);

  const receivePayment = async (event) => {
    event.preventDefault();
    if (!paymentBill || savingPayment) return;
    const amount = Number(paymentAmount);
    const outstanding = balanceOf(paymentBill);
    if (!Number.isFinite(amount) || amount <= 0 || amount > outstanding) {
      setNotice(
        hi
          ? `राशि ₹${money(outstanding)} से अधिक या शून्य नहीं हो सकती।`
          : `Enter an amount between ₹0.01 and ₹${money(outstanding)}.`
      );
      return;
    }

    setSavingPayment(true);
    setNotice("");
    const nextPaid = paidOf(paymentBill) + amount;
    const nextBalance = Math.max(0, totalOf(paymentBill) - nextPaid);
    const nextStatus = nextBalance <= 0.009 ? "paid" : "partial";
    const entry = {
      amount,
      method: paymentMethod,
      note: paymentNote.trim(),
      receivedAt: new Date().toISOString(),
    };

    try {
      await updateDoc(doc(db, "bills", paymentBill.id), {
        paidAmount: nextPaid,
        amountPaid: nextPaid,
        balanceDue: nextBalance,
        balanceAmount: nextBalance,
        paymentStatus: nextStatus,
        "payment.paid": nextPaid,
        "payment.balance": nextBalance,
        "payment.status": nextStatus,
        paymentEntries: arrayUnion(entry),
      });

      const updatedBill = {
        ...paymentBill,
        paidAmount: nextPaid,
        amountPaid: nextPaid,
        balanceDue: nextBalance,
        balanceAmount: nextBalance,
        paymentStatus: nextStatus,
        payment: {
          ...(paymentBill.payment || {}),
          paid: nextPaid,
          balance: nextBalance,
          status: nextStatus,
        },
        paymentEntries: [...(paymentBill.paymentEntries || []), entry],
      };
      setBills((current) =>
        current.map((bill) => bill.id === paymentBill.id ? updatedBill : bill)
      );
      setSelectedBill((current) =>
        current?.id === paymentBill.id ? updatedBill : current
      );
      setPaymentBill(null);
      setPaymentAmount("");
      setPaymentNote("");
      setNotice(hi ? "भुगतान सफलतापूर्वक दर्ज हो गया।" : "Payment recorded successfully.");
    } catch (err) {
      console.error("Payment update error:", err);
      setNotice(hi ? "भुगतान सेव नहीं हुआ। Firestore rules जाँचें।" : "Payment could not be saved. Check Firestore rules.");
    } finally {
      setSavingPayment(false);
    }
  };

  const exportFilteredPdf = () => {
    const rows = filteredBills
      .map((bill) => `<tr>
        <td>${escapeHtml(dateText(bill.createdAt, hi))}</td>
        <td>${escapeHtml(bill.billNumber || bill.invoiceNo || bill.id)}</td>
        <td>${escapeHtml(bill.customerName || "-")}<br><span class="muted">${escapeHtml(bill.customerMobile || "")}</span></td>
        <td>₹${money(totalOf(bill))}</td>
        <td>₹${money(paidOf(bill))}</td>
        <td>₹${money(balanceOf(bill))}</td>
        <td>${statusOf(bill) === "paid" ? (hi ? "भुगतान पूरा" : "Paid") : statusOf(bill) === "partial" ? (hi ? "आंशिक" : "Partial") : (hi ? "बकाया" : "Due")}</td>
      </tr>`)
      .join("");

    const filterDescription = [
      period === "all" ? (hi ? "सभी समय" : "All time") : period === "custom" ? `${fromDate || "—"} to ${toDate || "—"}` : period,
      status === "all" ? (hi ? "सभी स्थितियाँ" : "All statuses") : status,
      selectedCustomer || "",
      search ? `${hi ? "खोज" : "Search"}: ${search}` : "",
    ].filter(Boolean).join(" • ");

    const body = `
      <div class="print-head">
        <div><h1>${escapeHtml(profile.shopName || "BillBox")}</h1>
          <p>${escapeHtml(profile.address || "")}</p><p>${escapeHtml(profile.phone || "")}</p>
          <p>${escapeHtml(profile.gstNumber || "")}</p></div>
        <div class="right"><h1>${hi ? "ग्राहक लेजर रिपोर्ट" : "Customer Ledger Report"}</h1>
          <p>${hi ? "रिपोर्ट तारीख" : "Report date"}: ${dateText(new Date(), hi)}</p>
          <p>${escapeHtml(filterDescription)}</p></div>
      </div>
      <div class="stats">
        <div class="stat"><span>${hi ? "कुल बिक्री" : "TOTAL SALES"}</span><strong>₹${money(totals.total)}</strong></div>
        <div class="stat"><span>${hi ? "प्राप्त भुगतान" : "AMOUNT RECEIVED"}</span><strong>₹${money(totals.paid)}</strong></div>
        <div class="stat"><span>${hi ? "कुल बकाया" : "OUTSTANDING"}</span><strong>₹${money(totals.balance)}</strong></div>
      </div>
      <p>${hi ? "कुल रिकॉर्ड" : "Total records"}: <b>${filteredBills.length}</b></p>
      <table><thead><tr>
        <th>${hi ? "तारीख" : "Date"}</th><th>${hi ? "बिल नंबर" : "Bill no."}</th>
        <th>${hi ? "ग्राहक" : "Customer"}</th><th>${hi ? "कुल" : "Total"}</th>
        <th>${hi ? "जमा" : "Paid"}</th><th>${hi ? "बाकी" : "Balance"}</th>
        <th>${hi ? "स्थिति" : "Status"}</th>
      </tr></thead><tbody>${rows || `<tr><td colspan="7">${hi ? "कोई रिकॉर्ड नहीं" : "No records"}</td></tr>`}</tbody></table>
      <div class="footer">BillBox • ${hi ? "ग्राहक लेजर रिपोर्ट" : "Customer ledger report"}</div>`;
    openPrintDocument(hi ? "ग्राहक लेजर रिपोर्ट" : "Customer Ledger Report", body, language);
  };

  const downloadBillPdf = (bill) => {
    const billNo = bill.billNumber || bill.invoiceNo || bill.id;
    openPrintDocument(
      `${hi ? "बिल" : "Bill"}-${billNo}`,
      buildBillPrintHtml(bill, profile, hi),
      language
    );
  };

  if (loading) {
    return (
      <PageLoader
        loading
        message={hi ? "ग्राहक लेजर तैयार हो रहा है..." : "Preparing customer ledger..."}
        fullScreen
      />
    );
  }

  const selectedItems = selectedBill ? getBillItems(selectedBill) : [];
  const selectedBase = selectedItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const selectedMaking = Number(
    selectedBill?.makingCharges ??
      selectedItems.reduce((sum, item) => sum + Number(item.makingCharges ?? item.chargesBreakdown?.makingTotal ?? 0), 0)
  );
  const selectedOther = Number(
    selectedBill?.otherCharges ??
      selectedItems.reduce((sum, item) => sum + Number(item.otherCharges ?? item.chargesBreakdown?.otherTotal ?? 0), 0)
  );
  const selectedDiscount = Number(selectedBill?.offer ?? selectedBill?.discount ?? 0);
  const selectedSubtotal = Number(selectedBill?.subtotal ?? selectedBase + selectedMaking + selectedOther - selectedDiscount);
  const selectedGst = Number(selectedBill?.gstAmount || 0);

  return (
    <main lang={hi ? "hi" : "en"} className={`ledger-page ${theme === "light" ? "ledger-light" : ""}`}>
      <header className="sales-header ledger-sales-header">
        <div className="sales-brand">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt={profile.shopName || "Shop logo"} />
          ) : (
            <div className="sales-brand-fallback">
              {(profile.shopName || "B").trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="ledger-brand-copy">
            <span>{profile.shopName || "BillBox"}</span>
            <strong>{hi ? "ग्राहक लेजर" : "CUSTOMER LEDGER"}</strong>
          </div>
        </div>
        <button type="button" className="sales-back" onClick={() => navigate("/dashboard")}>
          ← {hi ? "डैशबोर्ड" : "Dashboard"}
        </button>
      </header>

      <section className="ledger-content">
        <div className="ledger-title-row">
          <div>
            <span className="ledger-eyebrow">{hi ? "वित्तीय रिकॉर्ड" : "FINANCIAL OVERVIEW"}</span>
            <h1 className="ledger-page-title">{hi ? "ग्राहक लेन-देन" : "Customer Transactions"}</h1>
            <p>{hi ? "बिक्री, प्राप्त भुगतान और बकाया राशि का पूरा हिसाब।" : "A complete view of sales, collections and outstanding balances."}</p>
          </div>
          <div className="ledger-header-actions">
            <button className="ledger-refresh" onClick={loadBills}>↻ {hi ? "रिफ्रेश" : "Refresh"}</button>
          </div>
        </div>

        {notice && <div className="ledger-notice" role="status">{notice}</div>}
        {error && <div className="ledger-error">{error}</div>}

        <div className="ledger-stats">
          <article><span>{hi ? "कुल बिक्री" : "TOTAL SALES"}</span><strong>₹{money(totals.total)}</strong><small>{filteredBills.length} {hi ? "बिल" : "bills"}</small></article>
          <article><span>{hi ? "प्राप्त भुगतान" : "AMOUNT RECEIVED"}</span><strong>₹{money(totals.paid)}</strong><small>{totals.paidBills} {hi ? "पूरी तरह भुगतान" : "fully paid"}</small></article>
          <article className="ledger-outstanding"><span>{hi ? "कुल बकाया" : "OUTSTANDING"}</span><strong>₹{money(totals.balance)}</strong><small>{totals.dueBills} {hi ? "बिल में बकाया" : "bills with due"}</small></article>
        </div>

        <section className="ledger-filter-panel">
          <div className="ledger-filter-heading">
            <h2>{hi ? "रिकॉर्ड फ़िल्टर करें" : "Filter transactions"}</h2>
            <button onClick={() => { setSearch(""); setPeriod("all"); setStatus("all"); setFromDate(""); setToDate(""); setSelectedCustomer(""); }}>{hi ? "रीसेट" : "Reset filters"}</button>
          </div>
          <div className="ledger-filters">
            <label className="ledger-search">{hi ? "ग्राहक / मोबाइल / बिल नंबर" : "Customer / mobile / bill number"}
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={hi ? "नाम, मोबाइल या बिल खोजें" : "Search name, mobile or bill"} />
            </label>
            <label>{hi ? "समय अवधि" : "Period"}
              <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="all">{hi ? "ओवरऑल / सभी समय" : "Overall / All time"}</option>
                <option value="1m">{hi ? "पिछला 1 महीना" : "Last 1 month"}</option>
                <option value="2m">{hi ? "पिछले 2 महीने" : "Last 2 months"}</option>
                <option value="3m">{hi ? "पिछले 3 महीने" : "Last 3 months"}</option>
                <option value="custom">{hi ? "तारीख के अनुसार" : "Custom dates"}</option>
              </select>
            </label>
            <label>{hi ? "भुगतान स्थिति" : "Payment status"}
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">{hi ? "सभी बिल" : "All bills"}</option>
                <option value="due">{hi ? "बकाया बिल" : "Outstanding bills"}</option>
                <option value="partial">{hi ? "आंशिक भुगतान" : "Partially paid"}</option>
                <option value="paid">{hi ? "पूरी तरह भुगतान" : "Fully paid"}</option>
              </select>
            </label>
            <label>{hi ? "ग्राहक" : "Customer"}
              <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                <option value="">{hi ? "सभी ग्राहक" : "All customers"}</option>
                {customers.map((customer) => <option key={customer.key} value={customer.key}>{customer.name}{customer.mobile ? ` • ${customer.mobile}` : ""}</option>)}
              </select>
            </label>
            {period === "custom" && <>
              <label>{hi ? "शुरुआती तारीख" : "From date"}<input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
              <label>{hi ? "अंतिम तारीख" : "To date"}<input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} /></label>
            </>}
          </div>
        </section>

        <section className="ledger-customer-section">
          <div className="ledger-section-head">
            <div><span>{hi ? "ग्राहकवार हिसाब" : "CUSTOMER-WISE SUMMARY"}</span><h2>{hi ? "किस ग्राहक का कितना बकाया है" : "Customer balances"}</h2></div>
            <small>{customers.length} {hi ? "ग्राहक" : "customers"}</small>
          </div>
          <div className="ledger-customer-grid">
            {customers.map((customer) => (
              <article className="ledger-customer-card" key={customer.key}>
                <div className="ledger-customer-name">
                  <span>{(customer.name || "C").trim().charAt(0).toUpperCase()}</span>
                  <div><strong>{customer.name}</strong><small>{customer.mobile || (hi ? "मोबाइल उपलब्ध नहीं" : "No mobile number")}</small></div>
                </div>
                <div className="ledger-customer-numbers">
                  <div><small>{hi ? "कुल बिल" : "BILLED"}</small><b>₹{money(customer.total)}</b></div>
                  <div><small>{hi ? "जमा" : "PAID"}</small><b>₹{money(customer.paid)}</b></div>
                  <div className="due"><small>{hi ? "बाकी" : "DUE"}</small><b>₹{money(customer.balance)}</b></div>
                </div>
                <button type="button" onClick={() => {
                  const customerBills = filteredBills.filter((bill) =>
                    (bill.customerMobile || bill.customerName || "unknown") === customer.key
                  );
                  const billToOpen = customerBills.find((bill) => balanceOf(bill) > 0.009) || customerBills[0];
                  if (billToOpen) setSelectedBill(billToOpen);
                }}>{hi ? "बिल देखें" : "View bill"} →</button>
              </article>
            ))}
            {!customers.length && <div className="ledger-empty">{hi ? "कोई ग्राहक रिकॉर्ड नहीं मिला।" : "No customer records found."}</div>}
          </div>
        </section>

        <section className="ledger-bills-section">
          <div className="ledger-section-head">
            <div><span>{hi ? "बिल रजिस्टर" : "INVOICE REGISTER"}</span><h2>{hi ? "सभी बिल और भुगतान" : "Bills & payments"}</h2></div>
            <small>{filteredBills.length} {hi ? "रिकॉर्ड" : "records"}</small>
          </div>
          <div className="ledger-table-wrap">
            <table className="ledger-table">
              <thead><tr>
                <th>{hi ? "तारीख" : "Date"}</th><th>{hi ? "बिल नंबर" : "Bill no."}</th>
                <th>{hi ? "ग्राहक" : "Customer"}</th><th>{hi ? "कुल" : "Total"}</th>
                <th>{hi ? "जमा" : "Paid"}</th><th>{hi ? "बाकी" : "Balance"}</th>
                <th>{hi ? "स्थिति" : "Status"}</th><th>{hi ? "कार्य" : "Action"}</th>
              </tr></thead>
              <tbody>
                {filteredBills.map((bill) => {
                  const st = statusOf(bill);
                  const due = balanceOf(bill);
                  return (
                    <tr key={bill.id}>
                      <td>{dateText(bill.createdAt, hi)}</td>
                      <td className="ledger-bill-no">{bill.billNumber || bill.invoiceNo || bill.id.slice(0, 8)}</td>
                      <td><strong>{bill.customerName || (hi ? "ग्राहक" : "Customer")}</strong><small>{bill.customerMobile || ""}</small></td>
                      <td>₹{money(totalOf(bill))}</td><td>₹{money(paidOf(bill))}</td>
                      <td className={due > 0 ? "ledger-due" : ""}>₹{money(due)}</td>
                      <td><span className={`ledger-status ${st}`}>{st === "paid" ? (hi ? "भुगतान पूरा" : "Paid") : st === "partial" ? (hi ? "आंशिक" : "Partial") : (hi ? "बकाया" : "Due")}</span></td>
                      <td className="ledger-actions">
                        <button onClick={() => setSelectedBill(bill)}>{hi ? "बिल खोलें" : "Open bill"}</button>
                        {due > 0 && <button className="collect" onClick={() => { setPaymentBill(bill); setPaymentAmount(String(due)); setPaymentMethod("cash"); setPaymentNote(""); }}>{hi ? "भुगतान लें" : "Receive"}</button>}
                      </td>
                    </tr>
                  );
                })}
                {!filteredBills.length && <tr><td colSpan="8" className="ledger-empty">{hi ? "चुने गए फ़िल्टर में कोई बिल नहीं मिला।" : "No bills match the selected filters."}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {selectedBill && (
        <div className="bill-details-overlay ledger-bill-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBill(null); }}>
          <section className="bill-details-modal" role="dialog" aria-modal="true" aria-label={hi ? "बिल विवरण" : "Bill details"}>
            <div className="details-modal-top">
              <div className="details-modal-heading">
                <span>{hi ? "पुराना बिक्री रिकॉर्ड" : "PREVIOUS SALES RECORD"}</span>
                <h2>{hi ? "बिल का विवरण" : "Bill details"}</h2>
              </div>
              <button type="button" className="details-close" onClick={() => setSelectedBill(null)} aria-label={hi ? "बंद करें" : "Close"}>×</button>
            </div>

            <div className="details-identity">
              <div className="identity-brand">
                <div className="identity-logo">
                  {(selectedBill.shopLogoUrl || profile.logoUrl) ? <img src={selectedBill.shopLogoUrl || profile.logoUrl} alt={selectedBill.shopName || profile.shopName} /> : <strong>{(selectedBill.shopName || profile.shopName || "B").charAt(0).toUpperCase()}</strong>}
                </div>
                <div><strong>{selectedBill.shopName || profile.shopName || "BillBox"}</strong><span>{hi ? "विश्वास • शुद्धता • सुंदरता" : "TRUST • PURITY • BEAUTY"}</span></div>
              </div>
              <div className="identity-number"><span>{hi ? "बिल नंबर" : "Bill number"}</span><strong>#{selectedBill.billNumber || selectedBill.invoiceNo || selectedBill.id.slice(0, 7)}</strong></div>
            </div>

            <div className="details-info-grid">
              <div className="details-info-card"><span>{hi ? "तारीख और समय" : "Date & time"}</span><strong>{dateText(selectedBill.createdAt, hi)}</strong><small>{timeText(selectedBill.createdAt, hi) || "-"}</small></div>
              <div className="details-info-card"><span>{hi ? "ग्राहक" : "Customer"}</span><strong>{selectedBill.customerName || (hi ? "ग्राहक" : "Customer")}</strong><small>{selectedBill.customerMobile || (hi ? "मोबाइल नंबर उपलब्ध नहीं" : "Mobile unavailable")}</small></div>
              <div className="details-info-card"><span>{hi ? "कुल आभूषण" : "Total jewellery"}</span><strong>{selectedItems.length}</strong><small>{hi ? "अलग-अलग आइटम" : "Separate items"}</small></div>
              <div className="details-info-card"><span>{hi ? "कुल वजन" : "Total weight"}</span><strong>{number(selectedItems.reduce((sum, item) => sum + Number(item.weight || 0), 0))} {hi ? "ग्राम" : "grams"}</strong><small>{hi ? "सभी आभूषणों का वजन" : "Combined item weight"}</small></div>
              <div className="details-info-card"><span>{hi ? "बिल का प्रकार" : "Bill type"}</span><strong>{selectedBill.billType === "tax" ? (hi ? "पक्का बिल / टैक्स इनवॉइस" : "Tax invoice") : (hi ? "कच्चा बिल / अनुमान" : "Estimate / Non-tax invoice")}</strong><small>{selectedBill.gstEnabled ? `GST ${number(selectedBill.gstRate || 0)}%` : "GST —"}</small></div>
            </div>

            <div className="details-items-section">
              <div className="details-section-heading"><div><span>{hi ? "आभूषण" : "JEWELLERY"}</span><h3>{hi ? "खरीदे गए आभूषण" : "Purchased items"}</h3></div><strong>{selectedItems.length} {hi ? "आइटम" : "items"}</strong></div>
              <div className="details-items-list">
                {selectedItems.map((item, index) => (
                  <div className="details-item" key={`${selectedBill.id}-${index}`}>
                    <div className="details-item-number">{String(index + 1).padStart(2, "0")}</div>
                    <div className="details-item-main"><strong>{item.itemName || (hi ? "आभूषण" : "Jewellery")}</strong><span className={String(item.metal).toLowerCase() === "gold" ? "gold-label" : "silver-label"}>{item.metal || "-"}{item.carat ? ` • ${item.carat}` : ""}</span></div>
                    <div className="details-item-data"><span>{hi ? "मात्रा" : "Quantity"}</span><strong>{number(item.quantity || 1)} {hi ? "नग" : "pcs"}</strong></div>
                    <div className="details-item-data"><span>{hi ? "वजन" : "Weight"}</span><strong>{number(item.weight)} {hi ? "ग्राम" : "grams"}</strong></div>
                    <div className="details-item-data"><span>{hi ? "दर" : "Rate"}</span><strong>₹{money(item.rate)}</strong><small>{String(item.metal).toLowerCase() === "gold" ? (hi ? "प्रति 10 ग्राम" : "Per 10 grams") : (hi ? "प्रति किलो" : "Per kg")}</small></div>
                    <div className="details-item-amount"><span>{hi ? "आइटम राशि" : "Item amount"}</span><strong>₹{money(item.lineTotal ?? item.totalAmount ?? item.amount)}</strong></div>
                    {(item.hsnCode || item.skuCode || item.huid) && <div className="details-item-extra"><div className="details-extra-codes">{item.hsnCode && <span>HSN: {item.hsnCode}</span>}{item.skuCode && <span>SKU: {item.skuCode}</span>}{item.huid && <span>HUID: {item.huid}</span>}</div></div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="details-bottom-grid">
              <div className="details-shop-card">
                <span>{hi ? "दुकान की जानकारी" : "SHOP INFORMATION"}</span>
                <strong>{selectedBill.shopName || profile.shopName || "BillBox"}</strong>
                {(selectedBill.shopOwnerName || profile.ownerName) && <p>{hi ? "मालिक" : "Owner"}: {selectedBill.shopOwnerName || profile.ownerName}</p>}
                {(selectedBill.shopAddress || profile.address) && <p>{selectedBill.shopAddress || profile.address}</p>}
                {(selectedBill.shopPhone || profile.phone) && <small>{hi ? "फोन" : "Phone"}: {selectedBill.shopPhone || profile.phone}</small>}
                {(selectedBill.shopGstNumber || profile.gstNumber) && <small>GSTIN: {selectedBill.shopGstNumber || profile.gstNumber}</small>}
              </div>
              <div className="details-amount-card">
                <div className="details-amount-row"><span>{hi ? "आइटम राशि" : "Item amount"}</span><strong>₹{money(selectedBase)}</strong></div>
                {selectedMaking > 0 && <div className="details-amount-row"><span>{hi ? "मेकिंग चार्ज" : "Making charges"}</span><strong>₹{money(selectedMaking)}</strong></div>}
                <div className="details-amount-row"><span>{hi ? "अन्य शुल्क" : "Other charges"}</span><strong>₹{money(selectedOther)}</strong></div>
                {selectedDiscount > 0 && <div className="details-amount-row discount"><span>{hi ? "छूट / ऑफर" : "Discount / Offer"}</span><strong>- ₹{money(selectedDiscount)}</strong></div>}
                <div className="details-amount-row subtotal"><span>{hi ? "उप-योग" : "Subtotal"}</span><strong>₹{money(selectedSubtotal)}</strong></div>
                {selectedGst > 0 && <div className="details-amount-row"><span>GST ({number(selectedBill.gstRate || 0)}%)</span><strong>₹{money(selectedGst)}</strong></div>}
                <div className="details-grand-total"><span>{hi ? "कुल राशि" : "Grand total"}</span><strong>₹{money(totalOf(selectedBill))}</strong></div>
                <div className="details-amount-row details-payment-row"><span>{hi ? "प्राप्त राशि" : "Amount received"}</span><strong>₹{money(paidOf(selectedBill))}</strong></div>
                <div className="details-amount-row details-balance-row"><span>{hi ? "बाकी राशि" : "Balance due"}</span><strong>₹{money(balanceOf(selectedBill))}</strong></div>
                <div className="details-payment-status"><span>{hi ? "भुगतान स्थिति" : "Payment status"}</span><strong>{statusOf(selectedBill) === "paid" ? (hi ? "भुगतान पूरा" : "Paid") : statusOf(selectedBill) === "partial" ? (hi ? "आंशिक भुगतान" : "Partially paid") : (hi ? "भुगतान बाकी" : "Payment due")}</strong></div>
              </div>
            </div>

            {Array.isArray(selectedBill.paymentEntries) && selectedBill.paymentEntries.length > 0 && (
              <div className="ledger-payment-history">
                <h3>{hi ? "भुगतान इतिहास" : "Payment history"}</h3>
                {selectedBill.paymentEntries.map((entry, index) => <div key={`${selectedBill.id}-payment-${index}`}><span>{dateText(entry.receivedAt, hi)} · {entry.method || "-"}</span><strong>₹{money(entry.amount)}</strong>{entry.note && <small>{entry.note}</small>}</div>)}
              </div>
            )}

            <div className="details-modal-footer ledger-details-footer">
              <div><strong>{hi ? "BillBox • पुराना बिल रिकॉर्ड" : "BillBox • Previous bill record"}</strong><span>{hi ? "यह जानकारी आपके बिल रिकॉर्ड से ली गई है।" : "This bill is displayed from your saved records."}</span></div>
              <div className="ledger-details-actions">
                <button type="button" onClick={() => setSelectedBill(null)}>{hi ? "बंद करें" : "Close"}</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {paymentBill && (
        <div className="ledger-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingPayment) setPaymentBill(null); }}>
          <form className="ledger-payment-modal" onSubmit={receivePayment}>
            <span className="ledger-eyebrow">BILLBOX • PAYMENT ENTRY</span>
            <h2>{hi ? "भुगतान दर्ज करें" : "Receive payment"}</h2>
            <p>{paymentBill.customerName} · {paymentBill.billNumber || paymentBill.invoiceNo}</p>
            <div className="ledger-payment-balance"><small>{hi ? "वर्तमान बकाया" : "Outstanding balance"}</small><strong>₹{money(balanceOf(paymentBill))}</strong></div>
            <label>{hi ? "प्राप्त राशि (₹)" : "Amount received (₹)"}<input type="number" min="0.01" max={balanceOf(paymentBill)} step="0.01" required value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>
            <label>{hi ? "भुगतान का तरीका" : "Payment method"}<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash">{hi ? "नकद" : "Cash"}</option><option value="upi">UPI</option><option value="bank">{hi ? "बैंक ट्रांसफर" : "Bank transfer"}</option><option value="card">Card</option><option value="other">{hi ? "अन्य" : "Other"}</option></select></label>
            <label>{hi ? "नोट (वैकल्पिक)" : "Note (optional)"}<input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder={hi ? "रेफरेंस / टिप्पणी" : "Reference / note"} /></label>
            <div className="ledger-modal-actions"><button type="button" onClick={() => setPaymentBill(null)} disabled={savingPayment}>{hi ? "रद्द करें" : "Cancel"}</button><button type="submit" disabled={savingPayment}>{savingPayment ? (hi ? "सेव हो रहा है..." : "Saving...") : (hi ? "भुगतान सेव करें" : "Save payment")}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}

export default CustomerLedger;
