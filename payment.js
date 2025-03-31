// Settings Panel Functionality
let klarnaInstance = null;

const toggleSettings = () => {
    const content = document.querySelector('.settings-content');
    content.classList.toggle('open');
};

const getSelectedValues = (name) => {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
        .map(checkbox => checkbox.value);
};

const handleCustomValue = (event) => {
    const button = event.target;
    const targetId = button.getAttribute('data-for');
    const customInput = document.getElementById(`custom-${targetId}`);
    const select = document.getElementById(targetId);
    
    if (customInput.value.trim()) {
        // Create a new option with the custom value
        const option = document.createElement('option');
        option.value = customInput.value.trim();
        option.textContent = `Custom: ${customInput.value.trim()}`;
        option.selected = true;
        
        // Remove any previous custom option
        Array.from(select.options).forEach(opt => {
            if (opt.textContent.startsWith('Custom:')) {
                select.removeChild(opt);
            }
        });
        
        select.appendChild(option);
        select.value = customInput.value.trim();
        
        // Trigger update
        updateKlarnaPresentation();
    }
};

const getCurrentSettings = () => {
    return {
        locale: document.getElementById('locale').value,
        currency: document.getElementById('currency').value,
        amount: parseInt(document.getElementById('amount').value),
        request: getSelectedValues('requests'),
        buttonConfig: {
            label: document.getElementById('button-label').value,
            shape: document.getElementById('button-shape').value,
            theme: document.getElementById('button-theme').value,
            logoAlignment: document.getElementById('button-logo-alignment').value,
            id: document.getElementById('button-id').value || undefined
        }
    };
};

// Initialize Klarna SDK
const initKlarnaPayment = async () => {
    try {
        // Import and initialize Klarna SDK
        console.log('1. Importing Klarna SDK...');
        const { KlarnaSDK } = await import("https://js.klarna.com/web-sdk/v2/klarna.mjs");

        console.log('2. Initializing Klarna SDK...');
        klarnaInstance = await KlarnaSDK({
            clientId: "klarna_test_client_UWpTWTJoRjY5WWUjcipmaSlqTW5ScFFmeWFWa3JLNFosNzg1N2YyNzYtYmI0MC00OTMxLWExMTMtOTEyMDFhOGQ4OWU2LDEsd1BaQ3hyOFdxYVZDdWF4QVE0MzdCcTFDRE5pRE1FTm0yeUttbHNxVi9lcz0",
            partnerAccountId: "krn:partner:global:account:test:LZ1ATBQJ",
            locale: document.getElementById('locale').value
        });

        await updateKlarnaPresentation();

        // Add event listeners for settings
        document.querySelector('.settings-toggle').addEventListener('click', toggleSettings);
        
        // Add event listeners for custom inputs
        document.querySelectorAll('.use-custom').forEach(button => {
            button.addEventListener('click', handleCustomValue);
        });

        // Add event listeners for all settings inputs
        const settingsInputs = document.querySelectorAll('#locale, #currency, #amount, input[name="requests"], #button-label, #button-shape, #button-theme, #button-logo-alignment, #button-id');
        settingsInputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.addEventListener('change', updateKlarnaPresentation);
            } else {
                input.addEventListener('change', updateKlarnaPresentation);
                input.addEventListener('input', updateKlarnaPresentation);
            }
        });

        // Add payment method selection handling
        const paymentOptions = document.querySelectorAll('.payment-option');
        paymentOptions.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            option.addEventListener('click', async () => {
                radio.checked = true;
                paymentOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                await updatePaymentButton(radio.value);
            });
        });

        // Initial button state based on default selection
        const initialRadio = document.querySelector('input[name="payment-method"]:checked');
        if (initialRadio) {
            await updatePaymentButton(initialRadio.value);
        }

        console.log('Klarna SDK initialization complete!');
    } catch (error) {
        console.error('Failed to initialize Klarna:', error);
    }
};

const updateKlarnaPresentation = async () => {
    if (!klarnaInstance) return;

    try {
        // Clear existing content
        document.getElementById('icon-container').innerHTML = '';
        document.getElementById('header-container').innerHTML = '';
        document.getElementById('subheader-container').innerHTML = '';
        document.getElementById('button-container').innerHTML = '';

        const settings = getCurrentSettings();
        console.log('Updating Klarna presentation with settings:', settings);

        const paymentPresentation = await klarnaInstance.Payment.presentation(settings);
        
        // Log only the instruction value
        console.info('PaymentPresentationInstruction:', paymentPresentation.instruction);

        // Update icon
        const iconImg = document.createElement('img');
        iconImg.src = paymentPresentation.icon.imageUrl;
        iconImg.alt = paymentPresentation.icon.alt;
        iconImg.className = 'payment-icon';
        document.getElementById('icon-container').appendChild(iconImg);

        // Update header and subheader if requested
        if (settings.request.includes('HEADER')) {
            paymentPresentation.header.component("header-container");
        }
        if (settings.request.includes('SUBHEADER')) {
            paymentPresentation.subheader.enriched.component("subheader-container");
        }

        // Update button if Klarna is selected
        const selectedPayment = document.querySelector('input[name="payment-method"]:checked');
        if (selectedPayment && selectedPayment.value === 'klarna') {
            await updatePaymentButton('klarna');
        }
    } catch (error) {
        console.error('Failed to update Klarna presentation:', error);
    }
};

const updatePaymentButton = async (paymentMethod) => {
    const buttonContainer = document.getElementById('button-container');
    buttonContainer.innerHTML = '';

    if (paymentMethod === 'klarna' && klarnaInstance) {
        const settings = getCurrentSettings();
        const buttonConfig = {
            ...settings.buttonConfig,
            // Only include id if it's not empty
            ...(settings.buttonConfig.id && { id: settings.buttonConfig.id })
        };
        
        klarnaInstance.Payment.button(buttonConfig)
        .on("render", async (button) => {
            console.log('Button rendered');
        })
        .on("click", (button) => {
            console.log('Button clicked');
            return klarnaInstance.Payment.initiate({
                currency: settings.currency,
                amount: settings.amount
            });
        })
        .mount('#button-container');
    } else if (paymentMethod === 'credit-card') {
        const creditCardButton = document.createElement('button');
        creditCardButton.className = 'credit-card-button';
        creditCardButton.textContent = 'Pay with Credit Card';
        creditCardButton.addEventListener('click', () => {
            console.log('Credit card payment initiated');
            const settings = getCurrentSettings();
            alert(`Credit card payment initiated for ${(settings.amount / 100).toFixed(2)} ${settings.currency}`);
            // Add your credit card payment logic here
        });
        buttonContainer.appendChild(creditCardButton);
    }
};

document.addEventListener('DOMContentLoaded', initKlarnaPayment); 