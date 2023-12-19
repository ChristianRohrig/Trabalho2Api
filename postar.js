document.addEventListener('DOMContentLoaded', function () {
    const nomeUsuario = getCookie('nomeUsuario');
    const donoIdInput = document.getElementById('dono_id');

    // Verifica se o cookie 'nomeUsuario' não está presente (usuário não autenticado)
    if (!nomeUsuario) {
        window.location.href = 'login.html';
    } else {
        // Se o usuário está autenticado, obtém o ID do usuário do cookie 'idUsuario'
        const donoId = getCookie('idUsuario');

        // Define o valor do campo 'dono_id' no formulário com o ID do usuário
        donoIdInput.value = donoId;
    }


    function getCookie(nome) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(nome + '=')) {
                return cookie.substring(nome.length + 1);
            }
        }
        return null;
    }
});