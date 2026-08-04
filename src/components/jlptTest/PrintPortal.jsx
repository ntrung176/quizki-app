import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const PrintPortal = ({ children }) => {
    const [container, setContainer] = useState(null);

    useEffect(() => {
        let el = document.getElementById('quizki-print-portal');
        if (!el) {
            el = document.createElement('div');
            el.id = 'quizki-print-portal';
            document.body.appendChild(el);
        }
        setContainer(el);
    }, []);

    if (!container) return null;

    return createPortal(children, container);
};

export default PrintPortal;
