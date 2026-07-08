const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const toReplace = `      let resetLink = "";
      else {
          return res.status(400).json({ error: "Code OTP invalide (Mode Sandbox)" });
        }
      }`;

const replacement = `      let resetLink = "";
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/payments/sappay/perform", async (req, res) => {
    const { invoice_id, payment_processor_id, customer_msisdn, otp, trans_id, access_token, isTestMode } = req.body;
    try {
      const urls = { checkoutBase: isTestMode ? SAPPAY_BASE_CHECKOUT_SANDBOX : SAPPAY_BASE_CHECKOUT_PROD };
      
      if (isTestMode) {
        if (otp.toString() === "1234" || otp.toString() === "123456") {
          // sandbox mock logic passes
        } else {
          return res.status(400).json({ error: "Code OTP invalide (Mode Sandbox)" });
        }
      }`;

serverCode = serverCode.replace(toReplace, replacement);

// fix TS1128 and other syntax errors from missing commas/braces I caused in previous regexes
// server.ts(876,7): error TS1005: ',' expected.
// server.ts(880,4): error TS1128: Declaration or statement expected.
// I think those were in sappay mock functions. I'll just check TS.

fs.writeFileSync('server.ts', serverCode);

