/* «Жирный шрифт» в настройках айфона делает весь системный текст толще
   и шире, и надписи, снятые с эталона, начинают переноситься.
   У TikTok свой шрифт, на него эта настройка не действует.

   Системный шрифт айфона «резиновый»: толщина у него — ручка от 100
   до 1000. Выставляем её числом напрямую, так настройка до неё
   не дотягивается. Ширина текста при этом совпадает с обычным
   системным шрифтом до сотых долей точки (проверено на всех толщинах
   от обычной до самой жирной, в мелком и крупном размере). */

#import <CoreText/CoreText.h>
#import <UIKit/UIKit.h>
#import <react/renderer/textlayoutmanager/RCTFontUtils.h>

static const uint32_t kWght = 'wght';

/* толщина в понятиях UIKit (-1…1) → число на ручке */
static CGFloat WghtForWeight(UIFontWeight w)
{
  if (w <= UIFontWeightUltraLight + 0.01) return 100;
  if (w <= UIFontWeightThin + 0.01) return 200;
  if (w <= UIFontWeightLight + 0.01) return 300;
  if (w <= UIFontWeightRegular + 0.01) return 401;   // ровно 400 — «по умолчанию», айфон такую просьбу игнорирует
  if (w <= UIFontWeightMedium + 0.01) return 510;
  if (w <= UIFontWeightSemibold + 0.01) return 590;
  if (w <= UIFontWeightBold + 0.01) return 700;
  if (w <= UIFontWeightHeavy + 0.01) return 860;
  return 1000;
}

static UIFont *NoBoldSystemFont(CGFloat size, UIFontWeight weight)
{
  CTFontRef base = CTFontCreateUIFontForLanguage(kCTFontUIFontSystem, size, NULL);
  if (base == NULL) {
    return nil;
  }
  NSDictionary *attrs = @{(__bridge id)kCTFontVariationAttribute : @{@(kWght) : @(WghtForWeight(weight))}};
  CTFontDescriptorRef desc = CTFontDescriptorCreateWithAttributes((__bridge CFDictionaryRef)attrs);
  CTFontRef font = CTFontCreateCopyWithAttributes(base, size, NULL, desc);
  CFRelease(desc);
  CFRelease(base);
  return (__bridge_transfer UIFont *)font;
}

__attribute__((constructor)) static void InstallNoBoldFontResolver(void)
{
  /* RN зовёт это только для системного шрифта — «свои» подбирает сам */
  RCTSetDefaultFontResolver(^UIFont *(const RCTFontProperties &props) {
    CGFloat size = (isnan(props.sizeMultiplier) ? 1.0 : props.sizeMultiplier) * props.size;
    UIFontWeight weight = isnan(props.weight) ? UIFontWeightRegular : props.weight;
    return NoBoldSystemFont(size, weight);
  });
}
