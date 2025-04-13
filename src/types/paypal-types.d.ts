// src/types/paypal-types.d.ts
declare namespace paypal {
    interface PayPalButtonActions {
      order: {
        create(options: PayPalOrderCreateOptions): Promise<string>;
        capture(): Promise<PayPalCaptureDetails>;
      };
    }
  
    interface PayPalOrderCreateOptions {
      purchase_units: Array<{
        description?: string;
        amount: {
          currency_code: string;
          value: string;
        };
      }>;
    }
  
    interface PayPalCaptureDetails {
      id: string;
      status: string;
      payer: {
        email_address: string;
        payer_id: string;
        name?: {
          given_name: string;
          surname: string;
        };
      };
      purchase_units: any[];
    }
  
    function Buttons(options: {
      style?: {
        layout?: 'vertical' | 'horizontal';
        color?: 'gold' | 'blue' | 'silver' | 'black';
        shape?: 'rect' | 'pill';
        label?: 'paypal' | 'checkout' | 'buynow' | 'pay';
      };
      createOrder: (data: any, actions: PayPalButtonActions) => Promise<string>;
      onApprove: (data: any, actions: PayPalButtonActions) => Promise<void>;
      onError?: (error: any) => void;
      onCancel?: (data: any) => void;
    }): {
      render(selector: string): void;
    };
  }