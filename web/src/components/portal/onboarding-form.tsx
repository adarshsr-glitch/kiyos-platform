"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PortalStepper } from "@/components/portal/portal-stepper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useCustomer } from "@/lib/customer-context";

/* ------------------------------------------------------------------ */
/*  Dropdown option lists                                              */
/* ------------------------------------------------------------------ */

const COUNTRIES = [
  { value: "", label: "Select country" },
  { value: "India", label: "India" },
  { value: "United States", label: "United States" },
  { value: "---", label: "──────────", disabled: true },
  { value: "Australia", label: "Australia" },
  { value: "Canada", label: "Canada" },
  { value: "Germany", label: "Germany" },
  { value: "Singapore", label: "Singapore" },
  { value: "United Arab Emirates", label: "UAE" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Other", label: "Other" },
];

const NATIONALITIES = [
  { value: "", label: "Select nationality" },
  { value: "Indian", label: "Indian" },
  { value: "American (US)", label: "American (US)" },
  { value: "---", label: "──────────", disabled: true },
  { value: "British", label: "British" },
  { value: "Canadian", label: "Canadian" },
  { value: "Australian", label: "Australian" },
  { value: "Singaporean", label: "Singaporean" },
  { value: "Other", label: "Other" },
];

const INCOME_SOURCES = [
  { value: "", label: "Select source type" },
  { value: "Employment", label: "Employment" },
  { value: "Business / Self-employment", label: "Business / Self-employment" },
  { value: "Rental income", label: "Rental income" },
  { value: "Capital gains / Investments", label: "Capital gains / Investments" },
  { value: "Pension / Retirement", label: "Pension / Retirement" },
  { value: "Freelance / Consulting", label: "Freelance / Consulting" },
  { value: "Dividends", label: "Dividends" },
  { value: "Other", label: "Other" },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "INR", label: "INR (₹)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "Other", label: "Other" },
];

const RESIDENCY_STATUSES = [
  { value: "", label: "Select status" },
  { value: "Non-Resident (NR)", label: "Non-Resident (NR)" },
  { value: "Resident and Ordinarily Resident (ROR)", label: "Resident and Ordinarily Resident (ROR)" },
  { value: "Resident but Not Ordinarily Resident (RNOR)", label: "Resident but Not Ordinarily Resident (RNOR)" },
  { value: "US Resident (Green Card / Citizen)", label: "US Resident (Green Card / Citizen)" },
  { value: "Not sure", label: "Not sure" },
];

const VISA_TYPES = [
  { value: "", label: "Select visa type" },
  { value: "H-1B", label: "H-1B" },
  { value: "H-4", label: "H-4" },
  { value: "L-1", label: "L-1" },
  { value: "Green Card", label: "Green Card" },
  { value: "US Citizen", label: "US Citizen" },
  { value: "OCI", label: "OCI" },
  { value: "Student (F-1)", label: "Student (F-1)" },
  { value: "B-1/B-2 (Visitor)", label: "B-1/B-2 (Visitor)" },
  { value: "Other", label: "Other" },
];

const ASSET_TYPES = [
  { value: "", label: "Select asset type" },
  { value: "Property / Real estate", label: "Property / Real estate" },
  { value: "Bank account", label: "Bank account" },
  { value: "401(k) / IRA / Retirement", label: "401(k) / IRA / Retirement" },
  { value: "Brokerage / Stocks", label: "Brokerage / Stocks" },
  { value: "Mutual funds", label: "Mutual funds" },
  { value: "Fixed deposits", label: "Fixed deposits" },
  { value: "Cryptocurrency", label: "Cryptocurrency" },
  { value: "Business ownership", label: "Business ownership" },
  { value: "Other", label: "Other" },
];

/* ------------------------------------------------------------------ */

const STEPS = [
  { key: "personal", label: "Personal Info" },
  { key: "income", label: "Income" },
  { key: "residency", label: "Residency" },
  { key: "assets", label: "Assets" },
  { key: "review", label: "Review" },
];

function currencySymbol(currency: string) {
  switch (currency) {
    case "INR": return "₹";
    case "GBP": return "£";
    case "EUR": return "€";
    default: return "$";
  }
}

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { setOnboardingData, completeOnboarding } = useCustomer();

  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    dateOfBirth: "",
    nationality1: "",
    nationality2: "",
    currentCountry: "",
    currentCountryOther: "",
  });

  const [income, setIncome] = useState({
    primarySource: "",
    primarySourceOther: "",
    primaryAmount: "",
    primaryCurrency: "USD",
    primaryCountry: "",
    primaryCountryOther: "",
    secondarySource: "",
    secondarySourceOther: "",
    secondaryAmount: "",
    secondaryCurrency: "INR",
    secondaryCountry: "",
    secondaryCountryOther: "",
  });

  const [residency, setResidency] = useState({
    currentStatus: "",
    visaType: "",
    visaTypeOther: "",
    arrivalDate: "",
    previousCountry: "",
    previousCountryOther: "",
  });

  const [assets, setAssets] = useState({
    asset1Type: "",
    asset1TypeOther: "",
    asset1Country: "",
    asset1CountryOther: "",
    asset1Value: "",
    asset2Type: "",
    asset2TypeOther: "",
    asset2Country: "",
    asset2CountryOther: "",
    asset2Value: "",
  });

  const resolveCountry = (val: string, other: string) =>
    val === "Other" ? other : val;
  const resolveOther = (val: string, other: string) =>
    val === "Other" ? other : val;

  const handleSubmit = () => {
    const nationalities = [personalInfo.nationality1, personalInfo.nationality2]
      .map((n) => (n === "Other" ? "" : n))
      .filter(Boolean);

    setOnboardingData({
      personalInfo: {
        fullName: personalInfo.fullName,
        dateOfBirth: personalInfo.dateOfBirth,
        nationalities,
        currentCountry: resolveCountry(
          personalInfo.currentCountry,
          personalInfo.currentCountryOther
        ),
      },
      income: {
        sources: [
          {
            type: resolveOther(income.primarySource, income.primarySourceOther),
            amount: income.primaryAmount,
            currency: income.primaryCurrency,
            country: resolveCountry(income.primaryCountry, income.primaryCountryOther),
          },
          ...(income.secondarySource
            ? [
                {
                  type: resolveOther(income.secondarySource, income.secondarySourceOther),
                  amount: income.secondaryAmount,
                  currency: income.secondaryCurrency,
                  country: resolveCountry(income.secondaryCountry, income.secondaryCountryOther),
                },
              ]
            : []),
        ],
      },
      residency: {
        currentStatus: residency.currentStatus,
        visaType: resolveOther(residency.visaType, residency.visaTypeOther),
        arrivalDate: residency.arrivalDate,
        previousCountry: resolveCountry(
          residency.previousCountry,
          residency.previousCountryOther
        ),
      },
      assets: {
        items: [
          ...(assets.asset1Type
            ? [
                {
                  type: resolveOther(assets.asset1Type, assets.asset1TypeOther),
                  country: resolveCountry(assets.asset1Country, assets.asset1CountryOther),
                  approximateValue: assets.asset1Value,
                },
              ]
            : []),
          ...(assets.asset2Type
            ? [
                {
                  type: resolveOther(assets.asset2Type, assets.asset2TypeOther),
                  country: resolveCountry(assets.asset2Country, assets.asset2CountryOther),
                  approximateValue: assets.asset2Value,
                },
              ]
            : []),
        ],
      },
    });
    completeOnboarding();
    router.push("/portal/initial-report");
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return (
          personalInfo.fullName &&
          personalInfo.currentCountry &&
          (personalInfo.currentCountry !== "Other" || personalInfo.currentCountryOther)
        );
      case 1:
        return income.primarySource && income.primaryAmount;
      case 2:
        return residency.currentStatus;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <PortalStepper steps={STEPS} currentStep={STEPS[step].key} />

      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-medium text-foreground">
                Tell us about yourself
              </h3>
              <p className="text-sm text-muted-foreground">
                We need some basic information to understand your cross-border
                tax situation.
              </p>
              <div className="space-y-3 pt-2">
                <label className="block">
                  <span className="text-xs font-medium text-foreground">
                    Full name
                  </span>
                  <Input
                    value={personalInfo.fullName}
                    onChange={(e) =>
                      setPersonalInfo({ ...personalInfo, fullName: e.target.value })
                    }
                    placeholder="e.g. Rahul Sharma"
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">
                    Date of birth
                  </span>
                  <Input
                    type="date"
                    value={personalInfo.dateOfBirth}
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        dateOfBirth: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Primary nationality
                    </span>
                    <Select
                      value={personalInfo.nationality1}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          nationality1: e.target.value,
                        })
                      }
                      className="mt-1"
                    >
                      {NATIONALITIES.map((n) => (
                        <option key={n.value} value={n.value} disabled={n.disabled}>
                          {n.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Second nationality <span className="text-muted-foreground">(optional)</span>
                    </span>
                    <Select
                      value={personalInfo.nationality2}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          nationality2: e.target.value,
                        })
                      }
                      className="mt-1"
                    >
                      {NATIONALITIES.map((n) => (
                        <option key={n.value} value={n.value} disabled={n.disabled}>
                          {n.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">
                    Current country of residence
                  </span>
                  <Select
                    value={personalInfo.currentCountry}
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        currentCountry: e.target.value,
                      })
                    }
                    className="mt-1"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value} disabled={c.disabled}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </label>
                {personalInfo.currentCountry === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify country
                    </span>
                    <Input
                      value={personalInfo.currentCountryOther}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          currentCountryOther: e.target.value,
                        })
                      }
                      placeholder="Enter country name"
                      className="mt-1"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-medium text-foreground">
                Your income sources
              </h3>
              <p className="text-sm text-muted-foreground">
                Tell us about your primary and any secondary sources of income.
              </p>
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary income
                </p>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">
                    Source type
                  </span>
                  <Select
                    value={income.primarySource}
                    onChange={(e) =>
                      setIncome({ ...income, primarySource: e.target.value })
                    }
                    className="mt-1"
                  >
                    {INCOME_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </label>
                {income.primarySource === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify source
                    </span>
                    <Input
                      value={income.primarySourceOther}
                      onChange={(e) =>
                        setIncome({ ...income, primarySourceOther: e.target.value })
                      }
                      placeholder="e.g. Royalties"
                      className="mt-1"
                    />
                  </label>
                )}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Annual amount
                    </span>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {currencySymbol(income.primaryCurrency)}
                      </span>
                      <Input
                        value={income.primaryAmount}
                        onChange={(e) =>
                          setIncome({ ...income, primaryAmount: e.target.value })
                        }
                        placeholder="e.g. 150000"
                        className="pl-7"
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Currency
                    </span>
                    <Select
                      value={income.primaryCurrency}
                      onChange={(e) =>
                        setIncome({ ...income, primaryCurrency: e.target.value })
                      }
                      className="mt-1 w-[110px]"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Country
                    </span>
                    <Select
                      value={income.primaryCountry}
                      onChange={(e) =>
                        setIncome({ ...income, primaryCountry: e.target.value })
                      }
                      className="mt-1"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.value} value={c.value} disabled={c.disabled}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
                {income.primaryCountry === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify country
                    </span>
                    <Input
                      value={income.primaryCountryOther}
                      onChange={(e) =>
                        setIncome({ ...income, primaryCountryOther: e.target.value })
                      }
                      placeholder="Enter country name"
                      className="mt-1"
                    />
                  </label>
                )}

                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3">
                  Secondary income <span className="font-normal normal-case">(optional)</span>
                </p>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">
                    Source type
                  </span>
                  <Select
                    value={income.secondarySource}
                    onChange={(e) =>
                      setIncome({ ...income, secondarySource: e.target.value })
                    }
                    className="mt-1"
                  >
                    {INCOME_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </label>
                {income.secondarySource === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify source
                    </span>
                    <Input
                      value={income.secondarySourceOther}
                      onChange={(e) =>
                        setIncome({ ...income, secondarySourceOther: e.target.value })
                      }
                      placeholder="e.g. Royalties"
                      className="mt-1"
                    />
                  </label>
                )}
                {income.secondarySource && (
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
                    <label className="block">
                      <span className="text-xs font-medium text-foreground">
                        Annual amount
                      </span>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {currencySymbol(income.secondaryCurrency)}
                        </span>
                        <Input
                          value={income.secondaryAmount}
                          onChange={(e) =>
                            setIncome({ ...income, secondaryAmount: e.target.value })
                          }
                          placeholder="Optional"
                          className="pl-7"
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-foreground">
                        Currency
                      </span>
                      <Select
                        value={income.secondaryCurrency}
                        onChange={(e) =>
                          setIncome({ ...income, secondaryCurrency: e.target.value })
                        }
                        className="mt-1 w-[110px]"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-foreground">
                        Country
                      </span>
                      <Select
                        value={income.secondaryCountry}
                        onChange={(e) =>
                          setIncome({ ...income, secondaryCountry: e.target.value })
                        }
                        className="mt-1"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.value} value={c.value} disabled={c.disabled}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>
                )}
                {income.secondaryCountry === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify country
                    </span>
                    <Input
                      value={income.secondaryCountryOther}
                      onChange={(e) =>
                        setIncome({ ...income, secondaryCountryOther: e.target.value })
                      }
                      placeholder="Enter country name"
                      className="mt-1"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-medium text-foreground">
                Residency details
              </h3>
              <p className="text-sm text-muted-foreground">
                Your tax obligations depend heavily on your residency status and
                history.
              </p>
              <div className="space-y-3 pt-2">
                <label className="block">
                  <span className="text-xs font-medium text-foreground">
                    Current residency status
                  </span>
                  <Select
                    value={residency.currentStatus}
                    onChange={(e) =>
                      setResidency({
                        ...residency,
                        currentStatus: e.target.value,
                      })
                    }
                    className="mt-1"
                  >
                    {RESIDENCY_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">
                    Visa type <span className="text-muted-foreground">(if applicable)</span>
                  </span>
                  <Select
                    value={residency.visaType}
                    onChange={(e) =>
                      setResidency({ ...residency, visaType: e.target.value })
                    }
                    className="mt-1"
                  >
                    {VISA_TYPES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </Select>
                </label>
                {residency.visaType === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify visa type
                    </span>
                    <Input
                      value={residency.visaTypeOther}
                      onChange={(e) =>
                        setResidency({
                          ...residency,
                          visaTypeOther: e.target.value,
                        })
                      }
                      placeholder="e.g. E-2 Treaty Investor"
                      className="mt-1"
                    />
                  </label>
                )}
                <label className="block">
                  <span className="text-xs font-medium text-foreground">
                    Date of arrival in current country
                  </span>
                  <Input
                    type="date"
                    value={residency.arrivalDate}
                    onChange={(e) =>
                      setResidency({
                        ...residency,
                        arrivalDate: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-foreground">
                    Previous country of residence
                  </span>
                  <Select
                    value={residency.previousCountry}
                    onChange={(e) =>
                      setResidency({
                        ...residency,
                        previousCountry: e.target.value,
                      })
                    }
                    className="mt-1"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value} disabled={c.disabled}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </label>
                {residency.previousCountry === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify country
                    </span>
                    <Input
                      value={residency.previousCountryOther}
                      onChange={(e) =>
                        setResidency({
                          ...residency,
                          previousCountryOther: e.target.value,
                        })
                      }
                      placeholder="Enter country name"
                      className="mt-1"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-medium text-foreground">
                Assets and financial information
              </h3>
              <p className="text-sm text-muted-foreground">
                List any significant assets held across jurisdictions. This helps
                us identify reporting obligations.
              </p>
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Asset 1 <span className="font-normal normal-case">(optional)</span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Type
                    </span>
                    <Select
                      value={assets.asset1Type}
                      onChange={(e) =>
                        setAssets({ ...assets, asset1Type: e.target.value })
                      }
                      className="mt-1"
                    >
                      {ASSET_TYPES.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Country
                    </span>
                    <Select
                      value={assets.asset1Country}
                      onChange={(e) =>
                        setAssets({ ...assets, asset1Country: e.target.value })
                      }
                      className="mt-1"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.value} value={c.value} disabled={c.disabled}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Approx. value
                    </span>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {assets.asset1Country === "India" ? "₹" : "$"}
                      </span>
                      <Input
                        value={assets.asset1Value}
                        onChange={(e) =>
                          setAssets({ ...assets, asset1Value: e.target.value })
                        }
                        placeholder="e.g. 200000"
                        className="pl-7"
                      />
                    </div>
                  </label>
                </div>
                {assets.asset1Type === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify asset type
                    </span>
                    <Input
                      value={assets.asset1TypeOther}
                      onChange={(e) =>
                        setAssets({ ...assets, asset1TypeOther: e.target.value })
                      }
                      placeholder="e.g. Gold"
                      className="mt-1"
                    />
                  </label>
                )}
                {assets.asset1Country === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify country
                    </span>
                    <Input
                      value={assets.asset1CountryOther}
                      onChange={(e) =>
                        setAssets({ ...assets, asset1CountryOther: e.target.value })
                      }
                      placeholder="Enter country name"
                      className="mt-1"
                    />
                  </label>
                )}

                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3">
                  Asset 2 <span className="font-normal normal-case">(optional)</span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Type
                    </span>
                    <Select
                      value={assets.asset2Type}
                      onChange={(e) =>
                        setAssets({ ...assets, asset2Type: e.target.value })
                      }
                      className="mt-1"
                    >
                      {ASSET_TYPES.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Country
                    </span>
                    <Select
                      value={assets.asset2Country}
                      onChange={(e) =>
                        setAssets({ ...assets, asset2Country: e.target.value })
                      }
                      className="mt-1"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.value} value={c.value} disabled={c.disabled}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Approx. value
                    </span>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {assets.asset2Country === "India" ? "₹" : "$"}
                      </span>
                      <Input
                        value={assets.asset2Value}
                        onChange={(e) =>
                          setAssets({ ...assets, asset2Value: e.target.value })
                        }
                        placeholder="e.g. 50000"
                        className="pl-7"
                      />
                    </div>
                  </label>
                </div>
                {assets.asset2Type === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify asset type
                    </span>
                    <Input
                      value={assets.asset2TypeOther}
                      onChange={(e) =>
                        setAssets({ ...assets, asset2TypeOther: e.target.value })
                      }
                      placeholder="e.g. Gold"
                      className="mt-1"
                    />
                  </label>
                )}
                {assets.asset2Country === "Other" && (
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">
                      Specify country
                    </span>
                    <Input
                      value={assets.asset2CountryOther}
                      onChange={(e) =>
                        setAssets({ ...assets, asset2CountryOther: e.target.value })
                      }
                      placeholder="Enter country name"
                      className="mt-1"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-medium text-foreground">
                Review your information
              </h3>
              <p className="text-sm text-muted-foreground">
                Please confirm the details below before we run your initial
                assessment.
              </p>
              <div className="space-y-4 pt-2">
                <ReviewSection title="Personal Information">
                  <ReviewRow label="Name" value={personalInfo.fullName} />
                  <ReviewRow label="Date of birth" value={personalInfo.dateOfBirth} />
                  <ReviewRow
                    label="Nationalities"
                    value={[personalInfo.nationality1, personalInfo.nationality2]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <ReviewRow
                    label="Current country"
                    value={resolveCountry(
                      personalInfo.currentCountry,
                      personalInfo.currentCountryOther
                    )}
                  />
                </ReviewSection>
                <ReviewSection title="Income">
                  <ReviewRow
                    label="Primary source"
                    value={`${resolveOther(income.primarySource, income.primarySourceOther)} — ${currencySymbol(income.primaryCurrency)}${income.primaryAmount} (${resolveCountry(income.primaryCountry, income.primaryCountryOther)})`}
                  />
                  {income.secondarySource && (
                    <ReviewRow
                      label="Secondary source"
                      value={`${resolveOther(income.secondarySource, income.secondarySourceOther)} — ${currencySymbol(income.secondaryCurrency)}${income.secondaryAmount} (${resolveCountry(income.secondaryCountry, income.secondaryCountryOther)})`}
                    />
                  )}
                </ReviewSection>
                <ReviewSection title="Residency">
                  <ReviewRow label="Status" value={residency.currentStatus} />
                  <ReviewRow
                    label="Visa"
                    value={resolveOther(residency.visaType, residency.visaTypeOther)}
                  />
                  <ReviewRow label="Arrival date" value={residency.arrivalDate} />
                  <ReviewRow
                    label="Previous country"
                    value={resolveCountry(
                      residency.previousCountry,
                      residency.previousCountryOther
                    )}
                  />
                </ReviewSection>
                {(assets.asset1Type || assets.asset2Type) && (
                  <ReviewSection title="Assets">
                    {assets.asset1Type && (
                      <ReviewRow
                        label={resolveOther(assets.asset1Type, assets.asset1TypeOther)}
                        value={`${resolveCountry(assets.asset1Country, assets.asset1CountryOther)} — ${assets.asset1Value}`}
                      />
                    )}
                    {assets.asset2Type && (
                      <ReviewRow
                        label={resolveOther(assets.asset2Type, assets.asset2TypeOther)}
                        value={`${resolveCountry(assets.asset2Country, assets.asset2CountryOther)} — ${assets.asset2Value}`}
                      />
                    )}
                  </ReviewSection>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-center gap-3 pt-2">
        {step > 0 && (
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-6 gap-2"
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            size="lg"
            className="rounded-full px-8 gap-2"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            className="rounded-full px-8 gap-2"
            onClick={handleSubmit}
          >
            <Check className="h-4 w-4" />
            Submit and get your report
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right truncate">
        {value}
      </span>
    </div>
  );
}
