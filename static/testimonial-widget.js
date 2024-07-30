const TestimonialWidget = {
    init(userId, containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found.`);
            return;
        }
        this.fetchTestimonials(userId).catch(error => {
            console.error('Failed to fetch testimonials:', error);
            this.container.innerHTML = '<p>Failed to load testimonials. Please try again later.</p>';
        });
    },
    async fetchTestimonials(userId) {
        const apiUrl = new URL(`/api/testimonials/${userId}`, window.location.origin);
        const response = await fetch(apiUrl.toString());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const testimonials = await response.json();
        this.renderTestimonials(testimonials);
    },
    renderTestimonials(testimonials) {
        if (!Array.isArray(testimonials) || testimonials.length === 0) {
            this.container.innerHTML = '<p>No testimonials available at this time.</p>';
            return;
        }
        const html = `
            <div class="testimonial-grid">
                ${testimonials.map(t => this.renderTestimonial(t)).join('')}
            </div>
        `;
        this.container.innerHTML = html;
    },
    renderTestimonial(t) {
        const gravatarUrl = this.getGravatarUrl(t.reviewer_email);
        return `
            <div class="testimonial-card">
                <div class="testimonial-content">${this.escapeHtml(t.website_quote)}</div>
                <div class="testimonial-footer">
                    <img src="${gravatarUrl}" alt="${this.escapeHtml(t.reviewer_name)}" class="testimonial-avatar">
                    <div class="testimonial-info">
                        <div class="testimonial-author">${this.escapeHtml(t.reviewer_name)}</div>
                        <div class="testimonial-rating">Rating: ${t.score}/10</div>
                    </div>
                </div>
            </div>
        `;
    },
    getGravatarUrl(email, size = 50) {
        const hash = this.md5(email.toLowerCase().trim());
        return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
    },
    md5(string) {
        const utf8 = unescape(encodeURIComponent(string));
        const utf8Arr = new Uint8Array(utf8.split('').map(c => c.charCodeAt(0)));
        return crypto.subtle.digest('MD5', utf8Arr).then(hashBuffer => {
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        });
    },
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};