const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const session = require('express-session');

const app = express();
const port = 3000;

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'christianbd',
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  } else {
    console.log('Conectado ao banco de dados MySQL');
  }
});

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'imagens/');
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
});

passport.use(new GoogleStrategy({
    clientID: '1034411282101-po8kc7t8fb8l3angdm98btmqcojbtp62.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:3000/auth/google/callback',
  },
  (accessToken, refreshToken, profile, done) => {
    // Adicione a lógica para verificar o usuário no banco de dados ou criar um novo usuário
    return done(null, profile);
  }));
  
// Serialização e desserialização do usuário para sessões do Passport
passport.serializeUser((user, done) => {
    done(null, user);
  });
  
passport.deserializeUser((obj, done) => {
    done(null, obj);
  });


const upload = multer({ storage: storage });

// Configuração do mecanismo de renderização EJS
const ejs = require('ejs');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuração do method-override para suportar métodos HTTP PUT e DELETE
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use(cookieParser());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); 
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
app.use(session({
    secret: 'XyZ#9aB!cDeF$gH',
    resave: true,
    saveUninitialized: true,
  }));

app.use(passport.initialize());
app.use(passport.session());

// Rotas para autenticação com o Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Redireciona para a página principal após o login bem-sucedido
    res.redirect('/');
  }
);

// Rota para login
app.post('/login', (req, res) => {
    const { email, senha } = req.body;

    const query = 'SELECT * FROM usuarios WHERE email = ? AND senha = ?';
    db.query(query, [email, senha], (err, results) => {
        if (err) {
            console.error('Erro ao consultar o banco de dados:', err);
            res.status(500).json({ error: 'Erro interno do servidor' });
        } else {
            if (results.length > 0) {
                const nomeUsuario = results[0].nome;
                const idUsuario = results[0].id;
            
                res.cookie('nomeUsuario', nomeUsuario);
                res.cookie('idUsuario', idUsuario.toString());
                res.sendFile(path.join(__dirname, 'index.html'));
            } else {
                res.status(401).json({ error: 'Credenciais inválidas' });
            }
        }
    });
});

// Rota para postar animais
app.post('/postar', upload.single('imagem'), (req, res) => {
    const donoId = req.body.dono_id;
    const nome = req.body.nome;
    const descricao = req.body.descricao;
    const contato = req.body.contato;
    const imagem = req.file.filename;

    const sql = 'INSERT INTO animais (dono_id, nome, descricao, contato, imagem) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [donoId, nome, descricao, contato, `imagens/${imagem}`], (err, result) => {
        if (err) {
            console.error('Erro ao postar animal:', err);
            res.status(500).send('Erro ao postar animal');
        } else {
            res.redirect('/');
        }
    });
});

// Rota para obter informações sobre animais
app.get('/animais', (req, res) => {
    const query = 'SELECT * FROM animais';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao consultar o banco de dados:', err);
            res.status(500).json({ error: 'Erro interno do servidor' });
        } else {
            res.json(results);
        }
    });
});

// Rota para obter informações sobre um animal específico
app.get('/animal/:id', (req, res) => {
    const animalId = req.params.id;
    const query = 'SELECT * FROM animais WHERE id = ?';
    
    db.query(query, [animalId], (err, results) => {
        if (err) {
            console.error('Erro ao consultar o banco de dados:', err);
            res.status(500).json({ error: 'Erro interno do servidor' });
        } else {
            if (results.length > 0) {
                const animal = results[0];
                res.render('animal', { animal });
            } else {
                res.status(404).json({ error: 'Animal não encontrado' });
            }
        }
    });
});

// Rota para excluir um animal
app.delete('/deletar-animal/:id', (req, res) => {
    const idAnimal = req.params.id;
    const idUsuarioLogado = req.cookies.idUsuario;

    // Verificar se o usuário logado é o dono do animal
    const query = 'SELECT dono_id FROM animais WHERE id = ?';
    db.query(query, [idAnimal], (err, results) => {
        if (err) {
            console.error('Erro ao verificar o dono do animal:', err);
            res.status(500).json({ error: 'Erro interno do servidor' });
        } else {
            if (results.length > 0) {
                const donoIdAnimal = results[0].dono_id;
                if (donoIdAnimal.toString() === idUsuarioLogado) {
                    // Se o usuário logado é o dono do animal, procede com a exclusão
                    const deleteQuery = 'DELETE FROM animais WHERE id = ?';
                    db.query(deleteQuery, [idAnimal], (deleteErr, deleteResult) => {
                        if (deleteErr) {
                            console.error('Erro ao excluir o animal:', deleteErr);
                            res.status(500).json({ error: 'Erro interno do servidor' });
                        } else {
                            res.status(200).json({ message: 'Animal excluído com sucesso' });
                        }
                    });
                } else {
                    // Se o usuário logado não é o dono do animal, não permitir a exclusão
                    res.status(403).json({ error: 'Permissão negada. Você não é o dono do animal.' });
                }
            } else {
                res.status(404).json({ error: 'Animal não encontrado' });
            }
        }
    });
});

// Rota para editar informações de um animal
app.put('/editar-animal/:id', (req, res) => {
    const animalId = req.params.id;
    const { nome, descricao, contato } = req.body;

    const query = 'UPDATE animais SET nome = ?, descricao = ?, contato = ? WHERE id = ?';
    db.query(query, [nome, descricao, contato, animalId], (err, results) => {
        if (err) {
            console.error('Erro ao editar as informações do animal:', err);
            res.status(500).json({ error: 'Erro interno do servidor' });
        } else {
            res.status(200).json({ message: 'Informações do animal editadas com sucesso' });
        }
    });
});

// Rota para renderizar a página de registro
app.get('/registro', (req, res) => {
    res.render('registro.ejs'); 
});

// Rota para processar o formulário de registro
app.post('/registro', (req, res) => {
    const { nome, email, senha } = req.body;

    // Verifica se o email já está em uso
    const checkEmailQuery = 'SELECT * FROM usuarios WHERE email = ?';
    db.query(checkEmailQuery, [email], (checkEmailErr, checkEmailResults) => {
        if (checkEmailErr) {
            console.error('Erro ao verificar o email:', checkEmailErr);
            res.status(500).json({ error: 'Erro interno do servidor' });
        } else {
            if (checkEmailResults.length > 0) {
                res.status(400).json({ error: 'Este email já está em uso. Escolha outro.' });
            } else {
                // Se o email não está em uso, insere o novo usuário no banco de dados
                const insertUserQuery = 'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)';
                db.query(insertUserQuery, [nome, email, senha], (insertUserErr, insertUserResults) => {
                    if (insertUserErr) {
                        console.error('Erro ao inserir novo usuário:', insertUserErr);
                        res.status(500).json({ error: 'Erro interno do servidor' });
                    } else {
                        res.redirect('/index.html'); // Redireciona para a página de login após o registro bem-sucedido
                    }
                });
            }
        }
    });
});
app.listen(port, () => {
  console.log(`Servidor Node.js iniciado na porta ${port}`);
});