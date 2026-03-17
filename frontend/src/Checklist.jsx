import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Circle, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    // Instant Initialization from LocalCache
    const [checkedItems, setCheckedItems] = useState(() => {
        try {
            const local = localStorage.getItem('accounting_checklist');
            return local ? JSON.parse(local) : {};
        } catch (e) { return {}; }
    });
    
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Background sync disabled
    }, []);

    const toggleItem = (itemName) => {
        const next = { ...checkedItems, [itemName]: !checkedItems[itemName] };
        setCheckedItems(next);
        localStorage.setItem('accounting_checklist', JSON.stringify(next));
    };

    const totalItems = CHECKLIST_DATA.reduce((acc, c) => acc + c.subcategories.reduce((acc2, s) => acc2 + s.items.length, 0), 0);
    const completedCount = Object.values(checkedItems).filter(Boolean).length;


    return (
        <div className="min-h-screen bg-bg text-text font-serif">
            {/* Header - Fixed & Premium */}
            <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-xl border-b border-border p-4 md:px-8 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-2 bg-surface hover:bg-surface2 border border-border rounded-xl transition-all text-muted hover:text-accent group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="font-playfair text-lg md:text-2xl font-black text-white tracking-tight leading-none mb-1">
                            Roadmap Checklist
                        </h1>
                        <div className="font-plex text-[10px] text-accent tracking-[0.2em] uppercase font-bold">
                            KPO Mastery Track
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {saving && <Loader2 className="animate-spin text-accent" size={16} />}
                    <div className="hidden sm:flex flex-col items-end">
                        <div className="font-plex text-[10px] text-muted uppercase tracking-widest font-bold">Progress</div>
                        <div className="font-playfair text-xl font-bold text-accent">{completedCount} / {totalItems}</div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                {/* Mobile Progress Bar */}
                <div className="sm:hidden bg-surface border border-border p-4 rounded-2xl mb-2">
                     <div className="flex justify-between text-[11px] font-plex text-muted uppercase tracking-widest mb-2 font-bold">
                        <span>Course Completion</span>
                        <span>{Math.round((completedCount/totalItems)*100)}%</span>
                     </div>
                     <div className="h-2 w-full bg-bg border border-border rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-accent transition-all duration-700 ease-out"
                            style={{ width: `${(completedCount/totalItems)*100}%` }}
                        />
                     </div>
                </div>

                <div className="columns-1 lg:columns-2 gap-6 space-y-6">
                    {CHECKLIST_DATA.map((cat, cIdx) => (
                        <section key={cIdx} className="break-inside-avoid bg-surface border border-border rounded-3xl overflow-hidden shadow-xl hover:shadow-accent/5 transition-all duration-300">
                            <div className="bg-gradient-to-r from-accent/10 to-transparent px-6 py-4 border-b border-border">
                                <h2 className="font-playfair text-lg md:text-xl font-black text-accent tracking-wide">
                                    {cat.category}
                                </h2>
                            </div>
                            
                            <div className="p-4 md:p-6 space-y-8">
                                {cat.subcategories.map((sub, sIdx) => (
                                    <div key={sIdx} className="group/sub">
                                        <h3 className="font-plex text-[11px] font-black text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2 group-hover/sub:text-accent transition-colors">
                                            <span className="h-1.5 w-1.5 bg-accent/40 rounded-full" />
                                            {sub.name}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {sub.items.map((item, iIdx) => {
                                                const isChecked = checkedItems[item];
                                                return (
                                                    <div 
                                                        key={iIdx}
                                                        onClick={() => toggleItem(item)}
                                                        className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 group/item ${isChecked ? 'bg-accent/10 border-accent/40 text-accent ring-1 ring-accent/20' : 'bg-bg/40 border-border/60 hover:border-accent/40 hover:bg-surface/50'}`}
                                                    >
                                                        <div className={`mt-0.5 shrink-0 transition-transform group-active/item:scale-90 ${isChecked ? 'text-accent' : 'text-muted/30 group-hover/item:text-accent/40'}`}>
                                                            {isChecked ? <CheckCircle size={18} fill="currentColor" className="fill-accent/20" /> : <div className="h-[18px] w-[18px] rounded-full border-2 border-current" />}
                                                        </div>
                                                        <span className={`font-plex text-[12px] md:text-[13px] leading-snug transition-all ${isChecked ? 'font-bold' : 'text-text opacity-80 group-hover/item:opacity-100'}`}>
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

            {/* Float Stats - Desktop/Mobile Adaptive */}
            <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-auto bg-white text-black px-6 py-4 rounded-2xl md:rounded-full font-plex font-bold shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] flex items-center justify-between md:justify-center gap-4 border border-white/20 animate-slideUp">
                <div className="flex flex-col md:items-center leading-tight">
                    <span className="text-[10px] uppercase opacity-70 tracking-widest mb-0.5">Concepts Mastered</span>
                    <span className="text-lg md:text-xl font-black">
                        {completedCount} <span className="text-muted font-normal text-sm">/ {totalItems}</span>
                    </span>
                </div>
                <div className="h-10 w-px bg-black/10 hidden md:block" />
                <div className="p-2 md:p-3 bg-black text-white rounded-xl md:rounded-full">
                    <ListTodo size={20} />
                </div>
            </div>
        </div>
    );
}
