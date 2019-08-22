package html.impl;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import html.IHtmlJsAutoImporter;

public class HtmlJsAutoImporterImpl implements IHtmlJsAutoImporter {

	private String dir;
	
	private Thread checkThread;
	
	private boolean isDisposed;
	
	private Map<String, Html> path2HtmlMap = new HashMap<String, Html>();
	
	private static final String IMPORT_BEGIN_TAG="<!--auto-import-begin-->";
	private static final String IMPORT_END_TAG="<!--auto-import-end-->";
	private static final String HEAD_END_TAG="</head>";
	@Override
	public void handleOn(String dir) {
		this.dir = dir;
		checkThread = new Thread(new Runnable() {			
			@Override
			public void run() {
				runInThread();
			}
		});
		checkThread.setDaemon(true);;
		checkThread.start();
	}
	
	private void runInThread()
	{
		int k = 0;
		while(!isDisposed)
		{
			try {
				//过2s就同步带@前缀的html
				if(k >= 2)
				{
					List<String> pages = listPageHtmls(this.dir);
					Map<String, Html> newMap = new HashMap<String, Html>();
					if(pages != null)
					{
						for(String page : pages)
						{
							newMap.put(page, path2HtmlMap.get(page));
						}
					}
					path2HtmlMap = newMap;
				}
				//每1s就检查页面是否更新了，然后自动导入
				for(Map.Entry<String, Html> pair : path2HtmlMap.entrySet())
				{
					checkAndUpdate(pair.getKey());
				}
				Thread.sleep(1000);
				k++;
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}
	
	private void checkAndUpdate(String path)
	{
		Html html = path2HtmlMap.get(path);
		if(html == null)
		{
			html = createHtml(path);
			path2HtmlMap.put(path, html);
			importJs4Html(html);
			return;
		}
		//检查几个html是否发生了改变，如果没发生，就不做事
		if(!isChanged(html))
		{
			return;
		}
		importJs4Html(html);
	}
	
	private void importJs4Html(Html html)
	{
		String path = html.path;
		

		boolean inImportRegin = false;
		boolean foundImportRegion=false;
		StringBuffer sb = new StringBuffer();
		//import js
		try {

			BufferedReader reader = new BufferedReader(new FileReader(path));
			String line = reader.readLine();
			while(line != null)
			{
				if(line.trim().startsWith(IMPORT_BEGIN_TAG))
				{
					inImportRegin = true;
					foundImportRegion = true;
					sb.append(line);
					sb.append("\r\n");
					// import 
					importChildren(sb,html);
		
				}
				else if(line.trim().startsWith(IMPORT_END_TAG))
				{
					inImportRegin = false;
					sb.append(line);
					sb.append("\r\n");
				}
				else if(line.trim().toLowerCase().startsWith(HEAD_END_TAG))
				{
					if(!foundImportRegion)
					{
						sb.append(IMPORT_BEGIN_TAG);
						sb.append("\r\n");
						// import 
						importChildren(sb,html);
						sb.append(IMPORT_END_TAG);
						sb.append("\r\n");
					}
					sb.append(line);
					sb.append("\r\n");
				}
				else if(!inImportRegin)
				{
					sb.append(line);
					sb.append("\r\n");
				}
				line = reader.readLine();
			}
			reader.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
		
		try {
			PrintWriter writer = new PrintWriter(new File(path));
			writer.write(sb.toString());
			writer.flush();
			writer.close();
		} catch (Exception e) {
			
			e.printStackTrace();
		}
	}
	
	private void importChildren(StringBuffer sb, Html html)
	{
		List<Html> children  = html.children;
		if(children == null)
		{
			return;
		}
		for(Html child : children)
		{
			importChildren(sb, child);
			
			List<String> scripts = child.scripts;
			for(String item : scripts)
			{
				sb.append("	<script src='" + item + "'></script>\r\n");
			}
			sb.append("	<script src='" + child.name + ".js'></script>\r\n");
		}
	}
	
	private Html createHtml(String path)
	{
		Html html = new Html(path);
		File file = new File(path);
		html.lastMofied = file.lastModified();
		//parse html
		DocumentBuilderFactory fac= DocumentBuilderFactory.newInstance();
		//用上面的工厂创建一个文档解析器
        DocumentBuilder builder;
        
        List<String> list = new ArrayList<String>();
		try {
			builder = fac.newDocumentBuilder();
			Document doc=builder.parse(path);
			
			NodeList scripts = doc.getElementsByTagName("script");
			int length = scripts.getLength();
			for(int i = 0; i < length; i++)
			{
				Element node = (Element) scripts.item(i);
				if(node.hasAttribute("src"))
				{
					list.add(node.getAttribute("src"));
				}
			}
			//include html
			List<String> includes = listInclude(html.dir, doc.getDocumentElement());
			if(includes  != null)
			{
				List<Html> children = new ArrayList<HtmlJsAutoImporterImpl.Html>();
				for(String item : includes)
				{
					children.add(createHtml(item));
				}
				html.children = children;
			}
			
		} catch (Exception e) {
			
			e.printStackTrace();
		}
		html.scripts = list;
		return html;
	}
	/**
	 * html以及include 子孙 结构发生了改变 
	 * @param html
	 * @return
	 */
	private boolean isChanged(Html html)
	{
		long lastModified = html.lastMofied;
		File file = new File(html.path);
		//检查改变
		if(file.lastModified() != lastModified)
		{
			Html changed = createHtml(html.path);
			if(html.childrenChanged(changed))
			{
				html.update(changed);
				return true;
			}
		}
		//如果自己没改变，就看孩子是否改变
		if(html.children == null)
		{
			return false;
		}
		for(Html child : html.children)
		{
			if(isIncludedHtmlChanged(child))
			{
				return true;
			}
		}
		return false;
	}
	
	private boolean isIncludedHtmlChanged(Html html)
	{
		long lastModified = html.lastMofied;
		File file = new File(html.path);
		//检查改变
		if(file.lastModified() != lastModified)
		{
			Html changed = createHtml(html.path);
			html2Js(html.path, html.name,html.path + ".js");
			if(html.scriptsAndChildrenChanged(changed))
			{
				html.update(changed);
				return true;
			}
		}
		//如果自己没改变，就看孩子是否改变
		if(html.children == null)
		{
			return false;
		}
		for(Html child : html.children)
		{
			if(isIncludedHtmlChanged(child))
			{
				return true;
			}
		}
		return false;
	}
	
	private void html2Js(String src,String name, String dest)
	{
		//import js
		try {

			PrintWriter writer = new PrintWriter(new File(dest));
			BufferedReader reader = new BufferedReader(new FileReader(src));
			String line = reader.readLine();
			name = name.replace(".", "_");
			writer.write("var $" + name + "=`\r\n");
			while(line != null)
			{
				writer.write(line);	
				writer.write("\r\n");
				line = reader.readLine();
			}
			writer.write("`");
			reader.close();
			writer.flush();
			writer.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	private List<String> listInclude(String dir, Element element)
	{
		List<String> result =null;
		if(element.hasAttribute("include"))
		{
			result = new ArrayList<String>();
			result.add(dir + File.separator + element.getAttribute("include"));
		}
		NodeList children = element.getChildNodes();
		int length = children.getLength();
		for(int i = 0; i < length; i++)
		{
			Node node = children.item(i);
			if(node.getNodeType() != Node.ELEMENT_NODE)
			{
				continue;
			}
			List<String> childrenIncludes =  listInclude(dir, (Element)node);
			if(childrenIncludes != null)
			{
				if(result == null)
				{
					result = new ArrayList<String>();
				}
				result.addAll(childrenIncludes);
			}
		}
		return result;
	}
	
 	private List<String> listPageHtmls(String dir)
	{
		File dirFile = new File(dir);
		if(!dirFile.exists())
		{
			return null;
		}
		List<String> result = new ArrayList<String>();
		File[] children = dirFile.listFiles();
		for(File child : children)
		{
			if(child.isDirectory())
			{
				 List<String> files = listPageHtmls(child.getAbsolutePath());
				 if(files != null)
				 {
					 result.addAll(files);
				 }
				 continue;
			}
			if(child.getName().startsWith("@"))
			{
				result.add(child.getAbsolutePath());
			}
		}
		return result;
	}
	
	private static class Html
	{
		private String path;
		private String name;
		private String dir;
		private long lastMofied;
		
		private List<String> scripts;
		
		private List<Html> children;
		
		public Html(String path)
		{
			this.path = path;
			int index =  path.lastIndexOf(File.separator);
			this.name = path.substring(index+1);
			this.dir = path.substring(0, index);
		}
		
		public void update(Html another)
		{
			this.lastMofied = another.lastMofied;
			this.scripts = another.scripts;
			this.children = another.children;
		}
		
		private boolean scriptsAndChildrenChanged(Html anotherHtml)
		{
			int scriptsLength = scripts == null ? 0 : scripts.size();
			int childrenLength = children == null ? 0 : children.size();
			
			int scripts1Length = anotherHtml.scripts == null ? 0 : anotherHtml.scripts.size();
			int children1Length = anotherHtml.children == null ? 0 : anotherHtml.children.size();
			
			if(scriptsLength != scripts1Length)
			{
				return true;
			}
			if(children1Length != childrenLength)
			{
				return true;
			}
			
			if(scripts1Length != 0)
			{
				for(String script : scripts)
				{
					if(!anotherHtml.scripts.contains(script))
					{
						return true;
					}
				}
			}
			if(children1Length != 0)
			{
				for(Html p : children)
				{
					if(!anotherHtml.children.contains(p))
					{
						return true;
					}
				}
			}
			
			return false;
		}
		
		private boolean childrenChanged(Html anotherHtml)
		{
			int childrenLength = children == null ? 0 : children.size();

			int children1Length = anotherHtml.children == null ? 0 : anotherHtml.children.size();
			

			if(children1Length != childrenLength)
			{
				return true;
			}

			if(children1Length == 0)
			{
				return false;
			}
			
			for(Html p : children)
			{
				if(!anotherHtml.children.contains(p))
				{
					return true;
				}
			}
			return false;
		}
		
		public boolean equals(Object item)
		{
			if(!(item instanceof Html))
			{
				return true;
			}
			return this.path.equals(((Html)item).path);
		}
	}
}
