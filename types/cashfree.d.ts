declare module "@cashfreepayments/cashfree-js" {
  export interface CashfreeInstance {
    checkout: (options: {
      paymentSessionId: string;
      redirectTarget?: "_self" | "_modal" | "_blank";
    }) => Promise<unknown>;
  }

  export function load(options: {
    mode: "sandbox" | "production" | string;
  }): Promise<CashfreeInstance>;
}
