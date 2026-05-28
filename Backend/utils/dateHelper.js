function normalizeDateToStartOfSaigon(dateString) {
    // dateString format: 'YYYY-MM-DD'
    // Default new Date('YYYY-MM-DD') will be at 00:00:00 UTC
    const date = new Date(`${dateString}T00:00:00.000Z`);
    
    // Asia/Saigon is UTC+7. 
    // So 00:00:00 in Saigon is 17:00:00 the previous day in UTC.
    date.setUTCHours(-7);
    
    return date;
}

module.exports = {
    normalizeDateToStartOfSaigon
};
