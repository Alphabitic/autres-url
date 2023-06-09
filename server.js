const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const dotenv = require('dotenv');
const express = require('express');
dotenv.config();

const PORT = 5001;

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: 'zola_andria@outlook.fr',
    pass: process.env.EMAIL_PASSWORD
  }
});

const Status = {
  Success: 'success',
  Failure: 'failure'
};

const checkLinks = async () => {
  const links = [
    'https://webmail.buyin.pro/lm_auth_proxy?DoLMLogin?curl=L2fowa&curlid=3446992831-3598899218',
    'https://webmail.adapei65.fr',
    'https://webmail.francebrevets.com',
    'https://sts.lixir.fr',
    'https://mail.nidek.fr/owa',
    'https://webmail.bredinprat.com/lm_auth_proxy?DoLMLogin?curl=L2fowa&curlid=1831998750-2022892364&curlmode=0',
    'https://www.lycra.com/en/coolmax-business',
    'https://www.fo-rothschild.fr',
    'https://francemutuelle.neocles.com',
    'https://adapei65.neocles.com',
    'https://gieccifinance.neocles.com',
    'https://eri.neocles.com/vpn/index_2auth.html',
    'https://proudreed.neocles.com/vpn/index.html',
    'https://procie.neocles.com/vpn/index.html',
    'https://sfcdc65.neocles.com',
    'https://sagess-ctx.neocles.com',
    'https://envoludia.neocles.com',
    'https://mail.francemutuelle.fr/lm_auth_proxy?DoLMLogin?curl=L2fowa&curlid=1799196252-2774585649',
  ];

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);  

  const results = [];
  for (const link of links) {
    let success = false;
    try {
      if (link.includes('/lm_auth_proxy?')) {
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 90000 });
      } else if (link === 'https://envoludia.neocles.com') {
        console.warn('Le lien https://envoludia.neocles.com doit être vérifié sur nomade !');
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });
      } else {
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 90000 });
      }
      console.log(`${link} - success`);
      success = true;
    } catch (error) {
      console.log(`${link} - Failure with Puppeteer`);
      console.log(error);
    }
    const status = success ? 'success' : 'failure';
    console.log(`${link} - ${status}`);
    results.push({
      num: results.length + 1,
      link: link,
      status: status === 'success' ? '🟢' : '🔴',
      remark: status === 'success' ? 'URL accessible' : 'URL inaccessible'
    });
  }

  await browser.close();
  return results;
};

const sendEmail = async (results) => {
  if (!Array.isArray(results)) {
    console.error('Erreur: "results" n\'est pas un tableau');
    return;
  }
  const tableRows = results.map(result => {
    let link = result.link;
    let remark = result.remark;
    if (link.includes('/lm_auth_proxy?')) {
      link = link.split('/lm_auth_proxy?')[0];
    }
    if (link === 'https://envoludia.neocles.com') {
      return `<tr><td style="border: 1px solid black; padding: 10px;">${result.num}</td><td style="border: 1px solid black; padding: 10px;"><a href="${result.link}">${link}</a></td><td style="border: 1px solid black; padding: 10px;"><span>🤔</span></td><td style="border: 1px solid black; padding: 10px;">A vérifier sur Nomade - ${remark}</td></tr>`;
    }
    return `<tr><td style="border: 1px solid black; padding: 10px;">${result.num}</td><td style="border: 1px solid black; padding: 10px;"><a href="${result.link}">${link}</a></td><td style="border: 1px solid #A9A9A9; padding: 10px; color: orange;">${result.status}</td><td style="border: 1px solid black; padding: 10px;">${remark}</td></tr>`
  }).join('');
  const emailContent =` <html style="border-collapse: collapse; margin: 0 auto; font-family: 'Times New Roman', Times, serif;"> <head> <style> table { border-collapse: collapse; margin: 0 auto; } th { background-color: black; color: orange; padding: 10px; border: 1px solid #A9A9A9; } td { border: 1px solid white; padding: 10px; border: 1px solid white; } </style> </head> <body> <table> <thead> <tr> <th style="border: 1px solid white; padding: 10px;">N°</th> <th style="border: 1px solid white; padding: 10px;">URL</th> <th style="border: 1px solid white; padding: 10px;">Status</th> <th style="border: 1px solid white; padding: 10px;">Note</th> </tr> </thead> <tbody> ${tableRows} </tbody> </table> <a href="https://mxtoolbox.com/">MXTOOLBOX</a></body> </html>` ;
  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: 'zola_andria@outlook.fr',
    subject: 'Résultats de vérification de liens',
    html: emailContent
  };
  
  // Envoi du mail
  try {
    await transporter.sendMail(mailOptions);
    console.log('Mail envoyé avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'envoi du mail', error);
  }
};

// Planifier l'exécution toutes les 10 minutes
async function runAll() {
  const results = await checkLinks();
  await sendEmail(results);
}

runAll();


app.listen(PORT, () => {
  console.log(`Le serveur est démarré sur le port ${PORT}`)
});