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
        flowInitiationMode: document.getElementById('flow-initiation-mode').value,
        subheaderStyle: document.querySelector('input[name="subheader-style"]:checked').value,
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
            clientId: "klarna_test_client_OCokWmxPU3lnS1d1eiNwRSpmTENQUFJEN0FwdXp2Q1IsMjJiOWM4MWYtN2QyMy00YTQ0LWJlMTgtYjUyNjg2ZjRlMDM1LDEsYlVqVnJKMDE4Z3k2SWp1VllFNHYzR3pmd0RhVFFvTUxlUXpveENKZi9MQT0",
            partnerAccountId: "krn:partner:global:account:test:M9CMI5CS",
            locale: document.getElementById('locale').value
        });

        console.log('3. SDK Initialized with locale:', document.getElementById('locale').value);
        console.log('4. Default Flow Initiation Mode:', document.getElementById('flow-initiation-mode').value);

        await updateKlarnaPresentation();

        // Add event listeners for settings
        document.querySelector('.settings-toggle').addEventListener('click', toggleSettings);
        
        // Add event listeners for custom inputs
        document.querySelectorAll('.use-custom').forEach(button => {
            button.addEventListener('click', handleCustomValue);
        });

        // Add event listeners for all settings inputs
        const settingsInputs = document.querySelectorAll('#locale, #currency, #amount, input[name="requests"], #button-label, #button-shape, #button-theme, #button-logo-alignment, #button-id, #flow-initiation-mode, input[name="subheader-style"]');
        settingsInputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
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
        console.log('Updating Klarna presentation with settings:', JSON.stringify(settings, null, 2));

        const paymentPresentation = await klarnaInstance.Payment.presentation(settings);
        
        // Log the full paymentPresentation object
        console.info('=== KLARNA SDK RESPONSE START ===');
        console.info('Complete Klarna Payment Presentation Response:', paymentPresentation);
        
        // Log the raw JSON for easy copying
        console.info('=== RAW JSON RESPONSE ===');
        console.info(JSON.stringify(paymentPresentation, null, 2));
        
        // Format the presentation data for better readability
        console.info('=== PRESENTATION DATA (FORMATTED) ===');
        console.info('Instruction:', paymentPresentation.instruction);
        console.info('Payment Button:', paymentPresentation.payment_button?.text || 'Not available');
        
        if (paymentPresentation.descriptor) {
            console.info('Header Text:', paymentPresentation.descriptor.header?.text || 'Not available');
            console.info('Subheader (Short):', paymentPresentation.descriptor.subheader?.short?.text || 'Not available');
            console.info('Subheader (Enriched):', paymentPresentation.descriptor.subheader?.enriched?.text || 'Not available');
            
            if (paymentPresentation.descriptor.subheader?.enriched?.link) {
                console.info('Learn More Link:', paymentPresentation.descriptor.subheader.enriched.link.href);
            }
            
            if (paymentPresentation.descriptor.icon) {
                console.info('Icon URLs Available:', 
                    Object.keys(paymentPresentation.descriptor.icon)
                    .filter(key => key.includes('_url'))
                    .map(key => key.replace('_image_url', ''))
                    .join(', ')
                );
            }
        }
        
        console.info('=== KLARNA SDK RESPONSE END ===');

        // Always display these elements if available, regardless of settings
        // Check if we have a descriptor property or direct properties
        const hasDescriptor = !!paymentPresentation.descriptor;
        
        // Get icon data - could be in descriptor.icon or directly in icon
        const iconData = hasDescriptor ? paymentPresentation.descriptor?.icon : paymentPresentation.icon;
        if (iconData) {
            const iconImg = document.createElement('img');
            // Use appropriate property based on where icon data is
            iconImg.src = iconData.badge_image_url || iconData.imageUrl || '';
            iconImg.alt = iconData.alt || 'Klarna';
            iconImg.className = 'payment-icon';
            document.getElementById('icon-container').appendChild(iconImg);
        }

        // Get header data - could be in descriptor.header or directly in header
        const headerData = hasDescriptor ? paymentPresentation.descriptor?.header : paymentPresentation.header;
        if (headerData?.text) {
            const headerEl = document.createElement('div');
            headerEl.textContent = headerData.text;
            headerEl.className = 'klarna-header';
            document.getElementById('header-container').appendChild(headerEl);
        }

        // Get subheader data - could be in descriptor.subheader or directly in subheader
        const subheaderData = hasDescriptor ? paymentPresentation.descriptor?.subheader : paymentPresentation.subheader;
        if (subheaderData) {
            // Get user's subheader style preference
            const subheaderStyle = settings.subheaderStyle || 'enriched';
            console.info('Using subheader style:', subheaderStyle);
            
            if (subheaderStyle === 'short' && subheaderData.short?.text) {
                // Display short subheader
                const subheaderWrapper = document.createElement('div');
                subheaderWrapper.className = 'klarna-subheader-wrapper';
                
                const subheaderText = document.createElement('span');
                subheaderText.textContent = subheaderData.short.text || '';
                subheaderWrapper.appendChild(subheaderText);
                
                document.getElementById('subheader-container').appendChild(subheaderWrapper);
            } 
            else if (subheaderData.enriched) {
                // Display enriched subheader with learn more link
                const subheaderWrapper = document.createElement('div');
                subheaderWrapper.className = 'klarna-subheader-wrapper';
                
                // Add the subheader text
                const subheaderText = document.createElement('span');
                subheaderText.textContent = subheaderData.enriched.text || '';
                subheaderWrapper.appendChild(subheaderText);
                
                // Add learn more link if available
                if (subheaderData.enriched.link) {
                    const link = document.createElement('a');
                    link.href = subheaderData.enriched.link.href;
                    link.textContent = subheaderData.enriched.link.link_text || 'Learn more';
                    link.target = '_blank';
                    link.className = 'klarna-learn-more';
                    link.style.marginLeft = '4px';
                    subheaderWrapper.appendChild(link);
                }
                
                document.getElementById('subheader-container').appendChild(subheaderWrapper);
            }
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
        
        try {
            // Get the current presentation response to access payment_button if needed
            const presentation = await klarnaInstance.Payment.presentation(settings);
            
            // Get button text from either payment_button or paymentButton
            const buttonText = presentation.payment_button?.text || 
                              presentation.paymentButton?.text || 
                              'Pay with Klarna';
            
            const buttonConfig = {
                ...settings.buttonConfig,
                // Only include id if it's not empty
                ...(settings.buttonConfig.id && { id: settings.buttonConfig.id }),
                // Use the button text if available
                text: buttonText
            };
            
            console.log('Creating button with config:', buttonConfig);
            
            // Try to use the button method from the SDK
            klarnaInstance.Payment.button(buttonConfig)
            .on("render", async (button) => {
                console.log('Button rendered');
            })
            .on("click", (button) => {
                console.log('Button clicked');
                console.info('Initiating Klarna payment with:');
                console.info('- Currency:', settings.currency);
                console.info('- Amount:', settings.amount);
                console.info('- Flow Initiation Mode:', settings.flowInitiationMode);
                
                return klarnaInstance.Payment.initiate({
                    currency: settings.currency,
                    amount: settings.amount,
                    flowInitiationMode: settings.flowInitiationMode
                });
            })
            .mount('#button-container');
        } catch (error) {
            console.error('Error creating Klarna button:', error);
            
            // Fallback to creating a custom button
            const fallbackButton = document.createElement('button');
            fallbackButton.className = 'custom-klarna-button';
            fallbackButton.textContent = 'Pay with Klarna';
            fallbackButton.addEventListener('click', () => {
                console.log('Fallback Klarna button clicked');
                klarnaInstance.Payment.initiate({
                    currency: settings.currency,
                    amount: settings.amount,
                    flowInitiationMode: settings.flowInitiationMode
                });
            });
            buttonContainer.appendChild(fallbackButton);
        }
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