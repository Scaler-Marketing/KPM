function fetchWithTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    return fetch(url, { ...options, signal })
        .then(response => {
            clearTimeout(timeoutId);
            return response;
        })
        .catch(error => {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
                throw new Error("Request timed out");
            }
            throw error;
        });
}

function cmsNest() {
    const fetchPromises = [];

    document.querySelectorAll("[data-cms-nest^='item']").forEach(item => {
        const linkElement = item.querySelector("[data-cms-nest='link']");
        if (!linkElement) {
            console.warn("CMS Nest: Link not found", item);
            return;
        }

        const linkHref = linkElement.getAttribute("href");
        if (!linkHref) {
            console.warn("CMS Nest: Href attribute not found", linkElement);
            return;
        }

        try {
            const url = new URL(linkHref, window.location.origin);
            if (url.hostname !== window.location.hostname) {
                console.warn("CMS Nest: URL is not on the same domain", url);
                return;
            }

            const fetchPromise = fetchWithTimeout(url, {}, 5000)
                .then(response => response.text())
                .then(htmlContent => {
                    const fetchedDocument = new DOMParser().parseFromString(htmlContent, "text/html");
                    let index = 1;

                    while (true) {
                        const dropzone = item.querySelector(`[data-cms-nest='dropzone-${index}']`);
                        if (!dropzone) break;

                        const target = fetchedDocument.querySelector(`[data-cms-nest='target-${index}']`);
                        if (target) {
                            dropzone.innerHTML = "";
                            dropzone.appendChild(target);
                        } else {
                            console.warn(`CMS Nest: Target-${index} not found in fetched content`, url);
                        }
                        index++;
                    }
                })
                .catch(error => {
                    console.error("CMS Nest: Error fetching the link or request timed out:", error);
                });

            fetchPromises.push(fetchPromise);
        } catch (error) {
            console.error("CMS Nest: Invalid URL", linkHref, error);
        }
    });

    Promise.all(fetchPromises)
        .then(() => {
            const event = new CustomEvent("cmsNestComplete");
            window.dispatchEvent(event);
        })
        .catch(error => {
            console.error("CMS Nest: One or more fetch requests failed", error);
        });
}

document.addEventListener("DOMContentLoaded", () => cmsNest());