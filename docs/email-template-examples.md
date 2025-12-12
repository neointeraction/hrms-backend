# Email Template Examples

## Birthday Email Template (with hosted image)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Banner Image (replace with your hosted image) -->
          <tr>
            <td>
              <img src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&h=200&fit=crop" alt="Birthday Banner" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🎉 Happy Birthday {{employee_name}}! 🎉</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Wishing you a wonderful birthday filled with joy, laughter, and amazing moments! 🎂
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for being such an important part of our team. Your dedication and positive energy make {{company_name}} a better place every day!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999999; font-size: 14px; margin: 0;">
                Best wishes,<br>
                <strong style="color: #667eea;">The {{company_name}} Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Anniversary Email Template (with company logo)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Logo -->
          <tr>
            <td style="padding: 30px 30px 0 30px; text-align: center;">
              <img src="https://yourcompany.com/logo.png" alt="{{company_name}}" style="max-width: 200px; height: auto;" />
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🎊 {{years_completed}} Years!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Congratulations {{employee_name}}!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Today marks a special milestone - your <strong style="color: #f5576c;">{{years_completed}} year anniversary</strong> with {{company_name}}!
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0;">
                Your contributions have been invaluable. Here's to many more years of success together!
              </p>
            </td>
          </tr>
          
          <!-- Stats -->
          <tr>
            <td style="padding: 0 30px 40px 30px;">
              <table width="100%" cellpadding="20" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                <tr>
                  <td align="center">
                    <p style="color: #ffffff; font-size: 48px; font-weight: bold; margin: 0;">{{years_completed}}</p>
                    <p style="color: #ffffff; font-size: 18px; margin: 10px 0 0 0;">Years of Excellence</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Using CID Attachments (for embedded images)

To use CID attachments, you would need to update the email sending code in `email.cron.js`:

```javascript
// Example with CID attachment
const result = await emailService.sendEmail({
  to: emp.email,
  subject: subject,
  html: body, // Reference images as <img src="cid:unique_identifier" />
  attachments: [
    {
      filename: 'logo.png',
      path: '/path/to/logo.png', // or use buffer
      cid: 'company_logo' // Referenced in HTML as <img src="cid:company_logo" />
    }
  ]
});
```

## Best Practices

1. **Use Table-Based Layout**: Email clients have limited CSS support, so use tables for layout
2. **Inline Styles**: Always use inline styles instead of `<style>` tags or external CSS
3. **Test Across Clients**: Test in Gmail, Outlook, Apple Mail, etc.
4. **Keep Width ≤ 600px**: Most email clients display well at 600px max width
5. **Use Web-Safe Fonts**: Arial, Helvetica, Georgia, Times New Roman are most reliable
6. **Optimize Images**: Keep image file sizes small, use hosted URLs
7. **Add Alt Text**: Always include alt attributes for images

## Placeholder Variables

The following variables can be used in email templates:
- `{{employee_name}}` - Employee's first and last name
- `{{company_name}}` - Company/tenant name
- `{{years_completed}}` - Years completed (anniversary emails only)
- `{{hr_name}}` - HR contact name (currently defaults to "HR Team")
