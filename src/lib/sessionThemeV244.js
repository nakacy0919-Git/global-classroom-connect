// Keep the original database enum and draft field IDs. Teachers choose only one
// theme; the compatible educational type is derived, never a second question.
export const THEME_TYPES_V244=Object.freeze({
 'Cultural Exchange':'cultural_exchange',
 'SDGs':'global_issues',
 'Mystery Skype':'other',
 'Language Exchange':'language_exchange',
 'Global Citizenship':'global_issues',
 'Free Topic':'other'
});
export const isOtherThemeV244=theme=>theme==='Free Topic';
export function validateThemeV244(theme,topic){
 if(!Object.hasOwn(THEME_TYPES_V244,theme))return 'Choose a session theme.';
 if(isOtherThemeV244(theme)&&!String(topic||'').trim())return 'Enter a specific topic for Other.';
 return '';
}
export function sessionTopicV244(theme,topic){
 return (isOtherThemeV244(theme)?String(topic||'').trim():String(theme||'')).slice(0,120);
}
export function syncThemeV244(root){
 const theme=root.querySelector('#gctp-theme'),topic=root.querySelector('#gctp-topic'),type=root.querySelector('#gctp-type');
 const other=isOtherThemeV244(theme.value);
 // Preserve text in the private draft if the teacher switches away and back.
 // The published topic only includes custom text when Other is selected.
 topic.closest('label').hidden=!other;
 topic.required=other;
 root.querySelector('#gctp-sdg-wrap').hidden=theme.value!=='SDGs';
 type.value=THEME_TYPES_V244[theme.value]||'';
 return validateThemeV244(theme.value,topic.value);
}
