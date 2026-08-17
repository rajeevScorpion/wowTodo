import { buildDateContext } from '../dateContext';

/**
 * These guard a defect that cost real accuracy: the model resolved named weekdays
 * wrongly 9/9 times because it was left to do the calendar arithmetic itself. The
 * arithmetic now happens here, so it is worth pinning.
 */
describe('buildDateContext', () => {
    // Monday 17 August 2026, local time.
    const monday = new Date(2026, 7, 17, 10, 0, 0);

    it('states the current date with its weekday', () => {
        expect(buildDateContext(monday)).toContain('[CURRENT DATE: 2026-08-17 (Monday)]');
    });

    it('resolves every weekday in the coming week to a concrete date', () => {
        const out = buildDateContext(monday);
        expect(out).toContain('Tuesday = 2026-08-18');
        expect(out).toContain('Wednesday = 2026-08-19');
        expect(out).toContain('Thursday = 2026-08-20');
        expect(out).toContain('Friday = 2026-08-21');
        expect(out).toContain('Saturday = 2026-08-22');
        expect(out).toContain('Sunday = 2026-08-23');
    });

    it('maps today\'s own weekday to a week ahead, not to today', () => {
        // Said on a Monday, "next Monday" means the 24th — never the 17th.
        expect(buildDateContext(monday)).toContain('Monday = 2026-08-24');
    });

    it('gives tomorrow explicitly', () => {
        expect(buildDateContext(monday)).toContain('tomorrow = 2026-08-18 (Tuesday)');
    });

    it('uses the local calendar date, not UTC', () => {
        // 00:30 local on 1 January is still 31 December in UTC for any timezone east of
        // Greenwich. India (UTC+05:30) is a primary market, so this must be local — a
        // UTC-derived tag dated every early-morning task to the previous day.
        const justAfterMidnight = new Date(2026, 0, 1, 0, 30, 0);
        expect(buildDateContext(justAfterMidnight)).toContain('[CURRENT DATE: 2026-01-01');
    });

    it('rolls over month and year boundaries', () => {
        const newYearsEve = new Date(2026, 11, 31, 9, 0, 0); // Thursday
        const out = buildDateContext(newYearsEve);
        expect(out).toContain('[CURRENT DATE: 2026-12-31 (Thursday)]');
        expect(out).toContain('tomorrow = 2027-01-01 (Friday)');
    });

    it('tells the model not to calculate dates itself', () => {
        expect(buildDateContext(monday)).toContain('do not work them');
    });
});
