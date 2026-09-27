import { channelsToHex, COLOR_KEYS, hexToRgbChannels } from '@/lib/theme-config';

describe('theme colour conversion', () => {
  // The tokens are space-separated RGB channels because Tailwind's alpha modifier
  // (`bg-primary/90`) needs them; a plain hex in the var silently breaks that.
  it('converts hex to the channel format the tokens expect', () => {
    expect(hexToRgbChannels('#b9ff66')).toBe('185 255 102');
    expect(hexToRgbChannels('#000000')).toBe('0 0 0');
    expect(hexToRgbChannels('#fff')).toBe('255 255 255');
  });

  // Round-tripping is what lets the settings page seed its colour pickers from
  // whatever the stylesheet currently resolves to.
  it('round-trips back to hex', () => {
    for (const hex of ['#b9ff66', '#19231f', '#f7f7f5']) {
      expect(channelsToHex(hexToRgbChannels(hex))).toBe(hex);
    }
    expect(channelsToHex('25, 26, 35')).toBe('#191a23');
  });

  it('returns black rather than NaN for an unparseable value', () => {
    expect(channelsToHex('')).toBe('#000000');
    expect(channelsToHex('inherit')).toBe('#000000');
  });

  it('covers every token the settings page renders', () => {
    // A token added to COLOR_GROUPS but not to COLOR_KEYS would silently never apply.
    expect(COLOR_KEYS).toContain('primary');
    expect(COLOR_KEYS).toContain('accent');
    expect(COLOR_KEYS).toContain('card-foreground');
    expect(new Set(COLOR_KEYS).size).toBe(COLOR_KEYS.length);
  });
});
