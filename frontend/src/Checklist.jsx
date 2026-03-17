import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Circle, Save, RefreshCw, Loader2, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const CHECKLIST_DATA = [
    {
        category: "1. ACCOUNTING BASICS",
        subcategories: [
            {
                name: "1.1 Accounting Equation",
                items: ["Assets = Liabilities + Equity", "Debit/Credit Rules (USA GAAP)", "Normal Account Balances", "T-Accounts & Ledger Posting"]
            },
            {
                name: "1.2 Accounting Methods",
                items: ["Cash Basis vs Accrual Basis (IRS Rules)", "Hybrid Accounting", "Tax Year Calendar (Jan-Dec)"]
            },
            {
                name: "1.3 Chart of Accounts",
                items: ["Asset Accounts (1000 series)", "Liability Accounts (2000 series)", "Equity Accounts (3000 series)", "Revenue Accounts (4000 series)", "Expense Accounts (5000/6000 series)", "Cost of Goods Sold (COGS)"]
            }
        ]
    },
    {
        category: "2. DAILY TRANSACTIONS",
        subcategories: [
            {
                name: "2.1 Sales & Revenue",
                items: ["Sales Journal / Sales Register", "Customer Invoicing (QuickBooks, FreshBooks)", "Sales Tax Collection (State & Local)", "Sales Returns & Allowances", "Credit Memos", "Revenue Recognition (ASC 606)"]
            },
            {
                name: "2.2 Purchases & Expenses",
                items: ["Purchase Orders (PO)", "Vendor Bills & Invoicing", "Accounts Payable (AP) Aging", "1099 Reporting (Vendor Payments)", "Expense Categories (Office, Travel, Meals)", "Receipt Management & Documentation"]
            },
            {
                name: "2.3 Cash Management",
                items: ["Cash Receipts Journal", "Cash Disbursements Journal", "Petty Cash Fund (Imprest System)", "Check Writing & Controls", "Wire Transfers & ACH Payments", "Credit Card Processing & Reconciliation"]
            }
        ]
    },
    {
        category: "3. BANKING & RECONCILIATION",
        subcategories: [
            {
                name: "3.1 Bank Reconciliation",
                items: ["Monthly Bank Statement Review", "Outstanding Checks", "Deposits in Transit", "Bank Fees & Interest Income", "NSF Checks (Bounced Checks)", "Book-to-Bank Reconciliation Process"]
            },
            {
                name: "3.2 Credit Card Reconciliation",
                items: ["Business Credit Card Statements", "Personal vs Business Expense Separation", "Credit Card Rewards Accounting"]
            }
        ]
    },
    {
        category: "4. ACCOUNTS RECEIVABLE (AR)",
        subcategories: [
            {
                name: "4.1 Customer Management",
                items: ["Customer Setup & Master Files", "Credit Terms (Net 30, Net 15, Due on Receipt)", "Credit Applications & Approvals", "AR Aging Reports (Current, 1-30, 31-60, 61-90, 90+)"]
            },
            {
                name: "4.2 Collections",
                items: ["Collection Calls & Emails", "Payment Plans", "Bad Debt Write-offs", "Allowance for Doubtful Accounts"]
            },
            {
                name: "4.3 Deposits & Prepayments",
                items: ["Customer Deposits (Unearned Revenue)", "Retainers & Advance Payments"]
            }
        ]
    },
    {
        category: "5. ACCOUNTS PAYABLE (AP)",
        subcategories: [
            {
                name: "5.1 Vendor Management",
                items: ["Vendor Setup & 1099 Tracking", "W-9 Collection (Taxpayer ID)", "Payment Terms Negotiation", "Early Payment Discounts (2/10 Net 30)"]
            },
            {
                name: "5.2 Bill Payment Process",
                items: ["Bill Approval Workflows", "Check Runs & Electronic Payments", "Recurring Bills (Rent, Utilities, Subscriptions)", "1099 Preparation & Filing (Jan 31 Deadline)"]
            }
        ]
    },
    {
        category: "6. PAYROLL (USA SPECIFIC)",
        subcategories: [
            {
                name: "6.1 Employee Setup",
                items: ["W-4 Form (Federal Withholding)", "State W-4 Forms (CA DE-4, NY IT-2104, etc.)", "I-9 Verification (Employment Eligibility)", "Direct Deposit Setup", "Employee Classification (W-2 vs 1099)"]
            },
            {
                name: "6.2 Gross Pay Calculation",
                items: ["Hourly vs Salary Employees", "Regular Pay & Overtime (1.5x over 40 hrs - FLSA)", "Double Time (State Specific)", "Commission & Bonus Payments", "Piece Rate Pay", "Shift Differentials"]
            },
            {
                name: "6.3 Payroll Deductions",
                items: ["401(k) Contributions (Employee Deferral)", "Health Insurance Premiums", "HSA Contributions", "FSA (Flexible Spending Account)", "Transit/Parking Benefits", "Roth 401(k)", "Union Dues", "Garnishments (Child Support, Tax Levies)", "Advances/Loans Repayment"]
            },
            {
                name: "6.4 Employer Payroll Taxes",
                items: ["FICA (Social Security - 6.2% up to wage base)", "Medicare (1.45% - no limit)", "FUTA (Federal Unemployment - 0.6% after credit)", "SUTA (State Unemployment - varies by state)", "FICA Employer Match (equal to employee)", "State Disability Insurance (CA SDI, NY DBL, etc.)", "Local Payroll Taxes (if applicable)"]
            },
            {
                name: "6.5 Payroll Tax Deposits",
                items: ["941 Deposit Schedule (Monthly/Semi-weekly)", "940 Annual FUTA Return (Jan 31)", "State UI Returns (Quarterly/Annual)", "New Hire Reporting (20 days)"]
            },
            {
                name: "6.6 Payroll Processing",
                items: ["Timesheet Collection & Approval", "Payroll Register Review", "Paycheck/Pay Stub Generation", "Off-Cycle & Manual Checks", "Payroll Journal Entries"]
            },
            {
                name: "6.7 Year-End Payroll",
                items: ["W-2 Form Distribution (Jan 31)", "W-3 Transmittal to SSA", "W-2 Corrections (W-2c)", "940 Filing", "Payroll Tax Reconciliation"]
            },
            {
                name: "6.8 Special Payroll Items",
                items: ["Tips & Gratuities (FICA Tip Credit)", "Severance Pay", "Final Paychecks (Accrued PTO Payout)", "Expense Reimbursements", "Moving Expenses (Taxable vs Non-taxable)", "Stock Options (RSU, ESPP)"]
            }
        ]
    },
    {
        category: "7. SALES TAX",
        subcategories: [
            {
                name: "7.1 Setup & Collection",
                items: ["Nexus Determination (Physical vs Economic)", "Sales Tax Permit/License (State/Local)", "Taxable vs Non-Taxable Products/Services", "Exemption Certificates (Resale Certificate)", "Sales Tax Rates (State + County + City)"]
            },
            {
                name: "7.2 Reporting & Filing",
                items: ["Sales Tax Returns (Monthly/Quarterly/Annual)", "E-Commerce Sales Tax (Wayfair Decision)", "Use Tax (Self-Assessment)", "Sales Tax Audit Documentation"]
            }
        ]
    },
    {
        category: "8. FINANCIAL REPORTING",
        subcategories: [
            {
                name: "8.1 Monthly Close Process",
                items: ["Account Reconciliation (All Balance Sheet Accounts)", "Preliminary Review", "Adjusting Journal Entries", "Management Review & Approval"]
            },
            {
                name: "8.2 Financial Statements",
                items: ["Income Statement (P&L)", "Balance Sheet", "Cash Flow Statement", "Statement of Retained Earnings"]
            },
            {
                name: "8.3 Management Reports",
                items: ["Budget vs Actual Analysis", "AR/AP Aging Reports", "Cash Flow Forecast", "Department/Job Costing Reports"]
            }
        ]
    },
    {
        category: "9. SOFTWARE & TOOLS",
        subcategories: [
            {
                name: "9.1 Accounting Software",
                items: ["QuickBooks Online/Desktop", "Xero", "FreshBooks / Wave", "Sage / NetSuite (Enterprise)", "Excel Bookkeeping (Small Business)"]
            },
            {
                name: "9.2 Payroll Software",
                items: ["Gusto", "ADP / Paychex", "QuickBooks Payroll", "Paylocity / BambooHR"]
            },
            {
                name: "9.3 Other Tools",
                items: ["Excel (Pivot Tables, VLOOKUP, SUMIFS)", "Google Workspace (Sheets, Docs)", "Receipt Capture Apps (Expensify, Dext)", "Bill Pay Services (Bill.com, Melio)"]
            }
        ]
    },
    {
        category: "10. COMPLIANCE & TAXES",
        subcategories: [
            {
                name: "10.1 Federal Compliance",
                items: ["IRS Record Retention (3-7 years)", "Income Tax Reporting (1120, 1065, 1120S)", "Estimated Tax Payments (1040-ES)", "1099-NEC Filing (Non-Employee Compensation)", "1099-INT, 1099-DIV, 1099-MISC"]
            },
            {
                name: "10.2 State Compliance",
                items: ["State Income Tax Withholding", "Franchise Tax", "Property Tax (Business Personal Property)", "Secretary of State Filings (Annual Reports)"]
            },
            {
                name: "10.3 Labor Law Posters",
                items: ["Federal (FLSA Minimum Wage Poster)", "State Labor Law Posters", "OSHA Requirements", "EEOC & Anti-Discrimination Compliance"]
            }
        ]
    },
    {
        category: "11. INTERNAL CONTROLS",
        subcategories: [
            {
                name: "11.1 Segregation of Duties",
                items: ["Authorization vs Recording vs Custody", "Check Signing Limits", "Approval Hierarchies"]
            },
            {
                name: "11.2 Fraud Prevention",
                items: ["Bank Account Reconciliation Frequency", "Vendor Master File Controls", "Surprise Cash Counts", "Background Checks (Payroll)"]
            }
        ]
    },
    {
        category: "12. MONTHLY/ANNUAL TASKS",
        subcategories: [
            {
                name: "12.1 Monthly Recurring",
                items: ["Bank Reconciliation", "Payroll Processing", "Sales Tax Filing", "AP Aging Review & Payments", "AR Aging & Collections", "Account Reconciliations", "Financial Statement Preparation"]
            },
            {
                name: "12.2 Annual/Quarterly",
                items: ["1099 Preparation & Distribution", "W-2 Distribution", "Tax Return Support (CPA Liaison)", "Budget Preparation", "Workers Compensation Audit", "401(k) Plan Audit", "Financial Statement Audit Preparation"]
            }
        ]
    }
];

export default function Checklist() {
    const [checkedItems, setCheckedItems] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load from Firestore
    useEffect(() => {
        const docRef = doc(db, "settings", "checklist");
        
        // Instant load from localStorage
        const local = localStorage.getItem('accounting_checklist');
        if (local) {
            try { setCheckedItems(JSON.parse(local)); } catch (e) {}
        }

        // Real-time sync
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCheckedItems(data);
                localStorage.setItem('accounting_checklist', JSON.stringify(data));
            }
            setLoading(false);
        }, (err) => {
            console.error("Firestore sync error:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const toggleItem = async (itemName) => {
        const next = { ...checkedItems, [itemName]: !checkedItems[itemName] };
        setCheckedItems(next);
        
        // Optimistic update to localStorage
        localStorage.setItem('accounting_checklist', JSON.stringify(next));

        // Background save to Firestore
        try {
            setSaving(true);
            await setDoc(doc(db, "settings", "checklist"), next);
            setSaving(false);
        } catch (e) {
            console.error("Save failed:", e);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <Loader2 className="text-accent animate-spin" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg text-text font-serif">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border p-4 md:px-10 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-bg border border-border rounded-lg hover:bg-surface2 transition-all text-muted hover:text-accent shadow-sm">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="font-playfair text-xl md:text-2xl font-bold flex items-center gap-2">
                            <ListTodo className="text-accent" /> Accounting Checklist
                        </h1>
                        <p className="font-plex text-[10px] text-muted tracking-widest uppercase">Syncs across PC & Mobile</p>
                    </div>
                </div>
                {saving && (
                    <div className="flex items-center gap-2 text-accent font-plex text-xs">
                        <RefreshCw size={14} className="animate-spin" /> saving...
                    </div>
                )}
            </header>

            <main className="max-w-5xl mx-auto p-6 md:p-10 pb-20">
                <div className="grid gap-10">
                    {CHECKLIST_DATA.map((cat, cIdx) => (
                        <section key={cIdx} className="bg-surface border border-border rounded-2xl overflow-hidden shadow-lg animate-fadeIn">
                            <div className="bg-surface2/50 px-6 py-4 border-b border-border">
                                <h2 className="font-playfair text-xl font-black text-accent tracking-tight">
                                    {cat.category}
                                </h2>
                            </div>
                            
                            <div className="divide-y divide-border/50">
                                {cat.subcategories.map((sub, sIdx) => (
                                    <div key={sIdx} className="p-6">
                                        <h3 className="font-plex text-xs font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border/30 pb-2">
                                            {sub.name}
                                        </h3>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {sub.items.map((item, iIdx) => {
                                                const isChecked = checkedItems[item];
                                                return (
                                                    <div 
                                                        key={iIdx}
                                                        onClick={() => toggleItem(item)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 group ${isChecked ? 'bg-accent/10 border-accent/40 text-accent ring-1 ring-accent/20' : 'bg-bg/50 border-border hover:border-accent/30 hover:bg-surface2'}`}
                                                    >
                                                        <div className={`shrink-0 transition-transform group-active:scale-95 ${isChecked ? 'text-accent' : 'text-muted/40'}`}>
                                                            {isChecked ? <CheckCircle size={20} fill="currentColor" className="fill-accent/20" /> : <Circle size={20} />}
                                                        </div>
                                                        <span className={`font-plex text-xs sm:text-[13px] leading-tight transition-all ${isChecked ? 'font-semibold' : 'text-text opacity-90'}`}>
                                                            {item.replace('• ', '')}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </main>

            {/* Float Stats */}
            <div className="fixed bottom-6 right-6 bg-accent text-[#0f0e0d] px-6 py-3 rounded-full font-plex font-bold shadow-2xl z-[100] flex items-center gap-3 border-2 border-white/20">
                <div className="flex flex-col items-center leading-none">
                    <span className="text-[10px] uppercase opacity-70 tracking-widest mb-1">Items Completed</span>
                    <span className="text-xl">
                        {Object.values(checkedItems).filter(Boolean).length} / {CHECKLIST_DATA.reduce((acc, c) => acc + c.subcategories.reduce((acc2, s) => acc2 + s.items.length, 0), 0)}
                    </span>
                </div>
            </div>
        </div>
    );
}
